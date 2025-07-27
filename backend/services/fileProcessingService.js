const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const path = require('path');

class FileProcessingService {
  constructor() {
    this.supportedFormats = ['.csv', '.xlsx', '.xls'];
  }

  /**
   * Process uploaded file and extract contact data
   * @param {string} filePath - Path to the uploaded file
   * @param {Object} mapping - Column mapping configuration
   */
  async processFile(filePath, mapping = {}) {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (!this.supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported file format: ${fileExtension}. Supported formats: ${this.supportedFormats.join(', ')}`);
      }

      let data = [];

      if (fileExtension === '.csv') {
        data = await this.processCsvFile(filePath);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        data = await this.processExcelFile(filePath);
      }

      // Apply column mapping and standardization
      const standardizedData = this.standardizeData(data, mapping);

      return {
        success: true,
        data: standardizedData,
        totalRows: standardizedData.length,
        originalFile: path.basename(filePath)
      };

    } catch (error) {
      console.error('File processing error:', error);
      return {
        success: false,
        error: error.message,
        totalRows: 0
      };
    }
  }

  /**
   * Process CSV file
   * @param {string} filePath - Path to CSV file
   */
  async processCsvFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          // Clean up data - remove extra whitespace and empty values
          const cleanedData = {};
          Object.keys(data).forEach(key => {
            const cleanKey = key.trim();
            const cleanValue = typeof data[key] === 'string' ? data[key].trim() : data[key];
            if (cleanValue !== '') {
              cleanedData[cleanKey] = cleanValue;
            }
          });
          results.push(cleanedData);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Process Excel file (XLSX/XLS)
   * @param {string} filePath - Path to Excel file
   */
  async processExcelFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Clean up data
      return jsonData.map(row => {
        const cleanedRow = {};
        Object.keys(row).forEach(key => {
          const cleanKey = key.trim();
          const cleanValue = typeof row[key] === 'string' ? row[key].trim() : row[key];
          if (cleanValue !== '' && cleanValue !== null && cleanValue !== undefined) {
            cleanedRow[cleanKey] = cleanValue;
          }
        });
        return cleanedRow;
      });

    } catch (error) {
      throw new Error(`Failed to process Excel file: ${error.message}`);
    }
  }

  /**
   * Standardize data format for consistent processing
   * @param {Array} data - Raw data from file
   * @param {Object} mapping - Column mapping configuration
   */
  standardizeData(data, mapping = {}) {
    const defaultMapping = {
      firstName: ['first_name', 'firstname', 'first name', 'fname', 'given_name'],
      lastName: ['last_name', 'lastname', 'last name', 'lname', 'family_name', 'surname'],
      fullName: ['name', 'full_name', 'fullname', 'full name', 'contact_name'],
      email: ['email', 'email_address', 'contact_email', 'e-mail', 'emailaddress'],
      title: ['title', 'job_title', 'position', 'role', 'designation'],
      company: ['company', 'company_name', 'organization', 'employer', 'org'],
      domain: ['domain', 'company_domain', 'website', 'company_website'],
      linkedinUrl: ['linkedin', 'linkedin_url', 'linkedin_profile', 'li_url'],
      phone: ['phone', 'phone_number', 'contact_number', 'mobile', 'telephone'],
      city: ['city', 'location_city', 'town'],
      state: ['state', 'province', 'region', 'location_state'],
      country: ['country', 'location_country'],
      industry: ['industry', 'sector', 'business_type']
    };

    // Merge with custom mapping
    const finalMapping = { ...defaultMapping, ...mapping };

    return data.map(row => {
      const standardizedRow = { originalData: row };

      // Map each standard field
      Object.keys(finalMapping).forEach(standardField => {
        const possibleColumns = finalMapping[standardField];
        const rowKeys = Object.keys(row).map(k => k.toLowerCase());

        // Find matching column
        for (const possibleCol of possibleColumns) {
          const matchingKey = rowKeys.find(key => 
            key === possibleCol.toLowerCase() || 
            key.includes(possibleCol.toLowerCase()) ||
            possibleCol.toLowerCase().includes(key)
          );

          if (matchingKey) {
            const originalKey = Object.keys(row).find(k => k.toLowerCase() === matchingKey);
            standardizedRow[standardField] = row[originalKey];
            break;
          }
        }
      });

      // Ensure we have either fullName or firstName+lastName
      if (!standardizedRow.fullName && (standardizedRow.firstName || standardizedRow.lastName)) {
        standardizedRow.fullName = `${standardizedRow.firstName || ''} ${standardizedRow.lastName || ''}`.trim();
      }

      // Split fullName if we don't have firstName/lastName
      if (standardizedRow.fullName && (!standardizedRow.firstName || !standardizedRow.lastName)) {
        const nameParts = standardizedRow.fullName.trim().split(' ');
        if (nameParts.length >= 2) {
          standardizedRow.firstName = standardizedRow.firstName || nameParts[0];
          standardizedRow.lastName = standardizedRow.lastName || nameParts.slice(1).join(' ');
        }
      }

      // Clean email
      if (standardizedRow.email) {
        standardizedRow.email = standardizedRow.email.toLowerCase().trim();
      }

      // Clean domain
      if (standardizedRow.domain) {
        standardizedRow.domain = standardizedRow.domain
          .replace(/^(https?:\/\/)?(www\.)?/, '')
          .replace(/\/$/, '')
          .toLowerCase()
          .trim();
      }

      return standardizedRow;
    }).filter(row => {
      // Filter out rows without essential data
      return row.email || (row.firstName && row.lastName) || row.fullName;
    });
  }

  /**
   * Get column suggestions for mapping
   * @param {string} filePath - Path to file
   */
  async getColumnSuggestions(filePath) {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      let sampleData = [];

      if (fileExtension === '.csv') {
        sampleData = await this.getSampleCsvData(filePath, 5);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        sampleData = await this.getSampleExcelData(filePath, 5);
      }

      const columns = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
      
      // Suggest mappings based on column names
      const suggestions = this.suggestColumnMappings(columns);

      return {
        success: true,
        columns,
        sampleData: sampleData.slice(0, 3), // Return first 3 rows as sample
        suggestions
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get sample data from CSV file
   * @param {string} filePath - Path to CSV file
   * @param {number} limit - Number of rows to sample
   */
  async getSampleCsvData(filePath, limit = 5) {
    return new Promise((resolve, reject) => {
      const results = [];
      let count = 0;
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          if (count < limit) {
            results.push(data);
            count++;
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Get sample data from Excel file
   * @param {string} filePath - Path to Excel file
   * @param {number} limit - Number of rows to sample
   */
  async getSampleExcelData(filePath, limit = 5) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      return jsonData.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to read Excel file: ${error.message}`);
    }
  }

  /**
   * Suggest column mappings based on column names
   * @param {Array} columns - Array of column names
   */
  suggestColumnMappings(columns) {
    const suggestions = {};
    const lowerColumns = columns.map(col => ({ original: col, lower: col.toLowerCase() }));

    const mappingRules = {
      firstName: ['first', 'fname', 'given'],
      lastName: ['last', 'lname', 'family', 'surname'],
      fullName: ['name', 'contact'],
      email: ['email', 'mail'],
      title: ['title', 'job', 'position', 'role'],
      company: ['company', 'org', 'employer'],
      domain: ['domain', 'website'],
      linkedinUrl: ['linkedin', 'li_'],
      phone: ['phone', 'mobile', 'tel'],
      city: ['city', 'town'],
      state: ['state', 'province', 'region'],
      country: ['country'],
      industry: ['industry', 'sector']
    };

    Object.keys(mappingRules).forEach(field => {
      const rules = mappingRules[field];
      
      for (const rule of rules) {
        const match = lowerColumns.find(col => 
          col.lower.includes(rule) || rule.includes(col.lower)
        );
        
        if (match && !suggestions[field]) {
          suggestions[field] = match.original;
          break;
        }
      }
    });

    return suggestions;
  }

  /**
   * Convert processed data to Apollo API format
   * @param {Array} processedData - Standardized data from file
   */
  convertToApolloFormat(processedData) {
    return processedData.map(row => {
      const apolloFormat = {};

      // Map to Apollo API fields
      if (row.firstName) apolloFormat.first_name = row.firstName;
      if (row.lastName) apolloFormat.last_name = row.lastName;
      if (row.fullName) apolloFormat.name = row.fullName;
      if (row.email) apolloFormat.email = row.email;
      if (row.company) apolloFormat.organization_name = row.company;
      if (row.domain) apolloFormat.domain = row.domain;
      if (row.linkedinUrl) apolloFormat.linkedin_url = row.linkedinUrl;

      return apolloFormat;
    }).filter(row => {
      // Ensure we have enough data for Apollo API
      return (row.first_name || row.name) && (row.email || row.organization_name || row.domain);
    });
  }

  /**
   * Export data to CSV format
   * @param {Array} data - Data to export
   * @param {string} outputPath - Output file path
   */
  async exportToCsv(data, outputPath) {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      fs.writeFileSync(outputPath, csvContent);

      return {
        success: true,
        filePath: outputPath,
        message: `Data exported to ${outputPath}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up uploaded files
   * @param {string} filePath - Path to file to clean up
   */
  async cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, message: 'File cleaned up successfully' };
      }
      return { success: true, message: 'File does not exist' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = FileProcessingService;
