const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FileProcessingService = require('../services/fileProcessingService');
const ApolloService = require('../services/apolloService');
const router = express.Router();

const fileProcessingService = new FileProcessingService();
const apolloService = new ApolloService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['.csv', '.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @route POST /api/files/upload
 * @desc Upload and process a file (CSV/Excel)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : {};

    // Process the file
    const result = await fileProcessingService.processFile(filePath, mapping);
    
    if (result.success) {
      // Store file info in session or database for later use
      const fileInfo = {
        id: path.basename(filePath, path.extname(filePath)),
        originalName: req.file.originalname,
        filePath: filePath,
        processedData: result.data,
        uploadTime: new Date().toISOString()
      };

      res.json({
        success: true,
        message: 'File uploaded and processed successfully',
        fileId: fileInfo.id,
        originalName: req.file.originalname,
        totalRows: result.totalRows,
        sampleData: result.data.slice(0, 5), // Return first 5 rows as sample
        columns: result.data.length > 0 ? Object.keys(result.data[0]).filter(key => key !== 'originalData') : []
      });
    } else {
      // Clean up file if processing failed
      await fileProcessingService.cleanupFile(filePath);
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up file on error
    if (req.file) {
      await fileProcessingService.cleanupFile(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during file upload'
    });
  }
});

/**
 * @route POST /api/files/preview
 * @desc Preview file contents and get column suggestions
 */
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    
    // Get column suggestions and sample data
    const result = await fileProcessingService.getColumnSuggestions(filePath);
    
    if (result.success) {
      res.json({
        success: true,
        originalName: req.file.originalname,
        columns: result.columns,
        sampleData: result.sampleData,
        suggestions: result.suggestions,
        fileId: path.basename(filePath, path.extname(filePath))
      });
    } else {
      res.status(400).json(result);
    }

    // Clean up preview file after response
    setTimeout(() => {
      fileProcessingService.cleanupFile(filePath);
    }, 5000);

  } catch (error) {
    console.error('File preview error:', error);
    
    // Clean up file on error
    if (req.file) {
      await fileProcessingService.cleanupFile(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during file preview'
    });
  }
});

/**
 * @route POST /api/files/process-and-enrich
 * @desc Process uploaded file and enrich data with Apollo API
 */
router.post('/process-and-enrich', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : {};
    const enrichOptions = req.body.enrichOptions ? JSON.parse(req.body.enrichOptions) : {};

    // Process the file
    const processResult = await fileProcessingService.processFile(filePath, mapping);
    
    if (!processResult.success) {
      await fileProcessingService.cleanupFile(filePath);
      return res.status(400).json(processResult);
    }

    // Convert to Apollo format
    const apolloData = fileProcessingService.convertToApolloFormat(processResult.data);
    
    if (apolloData.length === 0) {
      await fileProcessingService.cleanupFile(filePath);
      return res.status(400).json({
        success: false,
        error: 'No valid data found for Apollo enrichment'
      });
    }

    // Enrich data in batches (Apollo supports max 10 per request)
    const enrichedResults = [];
    const batchSize = 10;
    let totalCreditsConsumed = 0;

    for (let i = 0; i < apolloData.length; i += batchSize) {
      const batch = apolloData.slice(i, i + batchSize);
      
      try {
        const enrichResult = await apolloService.enrichPeopleBulk(batch, enrichOptions);
        
        if (enrichResult.success) {
          enrichedResults.push(...(enrichResult.data.matches || []));
          totalCreditsConsumed += enrichResult.creditsConsumed || 0;
        }
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < apolloData.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`Error enriching batch ${i}-${i + batchSize}:`, error);
      }
    }

    // Format results for email sending
    const formattedContacts = enrichedResults.map(person => 
      apolloService.formatPersonForEmail({ person })
    );

    res.json({
      success: true,
      message: 'File processed and data enriched successfully',
      originalRows: processResult.totalRows,
      apolloProcessed: apolloData.length,
      enrichedContacts: enrichedResults.length,
      creditsConsumed: totalCreditsConsumed,
      contacts: formattedContacts,
      sampleEnriched: formattedContacts.slice(0, 5)
    });

    // Clean up file after processing
    setTimeout(() => {
      fileProcessingService.cleanupFile(filePath);
    }, 1000);

  } catch (error) {
    console.error('File process and enrich error:', error);
    
    // Clean up file on error
    if (req.file) {
      await fileProcessingService.cleanupFile(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during file processing and enrichment'
    });
  }
});

/**
 * @route POST /api/files/export
 * @desc Export processed data to CSV
 */
router.post('/export', async (req, res) => {
  try {
    const { data, filename = 'exported_data.csv' } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required for export'
      });
    }

    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const outputPath = path.join(exportDir, filename);
    const result = await fileProcessingService.exportToCsv(data, outputPath);

    if (result.success) {
      // Send file for download
      res.download(outputPath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up file after download
        setTimeout(() => {
          fileProcessingService.cleanupFile(outputPath);
        }, 10000);
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during data export'
    });
  }
});

/**
 * @route GET /api/files/mapping-guide
 * @desc Get column mapping guide and suggestions
 */
router.get('/mapping-guide', (req, res) => {
  const guide = {
    standardFields: [
      { field: 'firstName', description: 'First name of the person', examples: ['John', 'Jane'] },
      { field: 'lastName', description: 'Last name of the person', examples: ['Doe', 'Smith'] },
      { field: 'fullName', description: 'Full name of the person', examples: ['John Doe', 'Jane Smith'] },
      { field: 'email', description: 'Email address', examples: ['john@company.com', 'jane.smith@example.org'] },
      { field: 'title', description: 'Job title or position', examples: ['CEO', 'Marketing Manager', 'Software Engineer'] },
      { field: 'company', description: 'Company or organization name', examples: ['Apollo Inc', 'TechCorp'] },
      { field: 'domain', description: 'Company domain or website', examples: ['apollo.io', 'techcorp.com'] },
      { field: 'linkedinUrl', description: 'LinkedIn profile URL', examples: ['https://linkedin.com/in/johndoe'] },
      { field: 'phone', description: 'Phone number', examples: ['+1-555-123-4567', '(555) 123-4567'] },
      { field: 'city', description: 'City location', examples: ['San Francisco', 'New York'] },
      { field: 'state', description: 'State or province', examples: ['California', 'NY'] },
      { field: 'country', description: 'Country', examples: ['United States', 'Canada'] }
    ],
    commonColumnNames: {
      firstName: ['first_name', 'firstname', 'first name', 'fname', 'given_name'],
      lastName: ['last_name', 'lastname', 'last name', 'lname', 'family_name', 'surname'],
      fullName: ['name', 'full_name', 'fullname', 'full name', 'contact_name'],
      email: ['email', 'email_address', 'contact_email', 'e-mail', 'emailaddress'],
      title: ['title', 'job_title', 'position', 'role', 'designation'],
      company: ['company', 'company_name', 'organization', 'employer', 'org'],
      domain: ['domain', 'company_domain', 'website', 'company_website'],
      linkedinUrl: ['linkedin', 'linkedin_url', 'linkedin_profile', 'li_url'],
      phone: ['phone', 'phone_number', 'contact_number', 'mobile', 'telephone']
    },
    tips: [
      'The system will automatically detect and suggest column mappings',
      'Ensure your file has headers in the first row',
      'Email addresses are required for sending emails',
      'Either firstName+lastName or fullName is required for personalization',
      'Company information helps with Apollo enrichment',
      'LinkedIn URLs and company domains improve enrichment accuracy'
    ]
  };

  res.json({
    success: true,
    data: guide
  });
});

module.exports = router;
