const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const EmailService = require('../services/emailService');
const ApolloService = require('../services/apolloService');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

const emailService = new EmailService();
const apolloService = new ApolloService();

/**
 * @route POST /api/email/send
 * @desc Send a single email
 */
router.post('/send', async (req, res) => {
  try {
    const emailData = req.body;

    if (!emailData.to || !emailData.subject || (!emailData.text && !emailData.html)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, and content (text or html)'
      });
    }

    const result = await emailService.sendEmail(emailData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId,
        to: result.to,
        subject: result.subject
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while sending email'
    });
  }
});

/**
 * @route POST /api/email/send-bulk
 * @desc Send bulk emails with optional delay
 */
router.post('/send-bulk', async (req, res) => {
  try {
    const { emails, delayMs = 1000 } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'Emails must be an array'
      });
    }

    if (emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No emails provided'
      });
    }

    // Validate each email
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      if (!email.to || !email.subject || (!email.text && !email.html)) {
        return res.status(400).json({
          success: false,
          error: `Email ${i + 1} is missing required fields: to, subject, and content`
        });
      }
    }

    const result = await emailService.sendBulkEmails(emails, delayMs);
    
    res.json({
      success: true,
      message: 'Bulk email sending completed',
      totalSent: result.totalSent,
      successCount: result.successCount,
      failureCount: result.failureCount,
      results: result.results
    });

  } catch (error) {
    console.error('Bulk email sending error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk email sending'
    });
  }
});

/**
 * @route POST /api/email/send-personalized-bulk
 * @desc Send personalized bulk emails using template and contact data
 */
router.post('/send-personalized-bulk', async (req, res) => {
  try {
    const { 
      template, 
      subject, 
      contacts, 
      customData = {}, 
      delayMs = 1000,
      from,
      replyTo 
    } = req.body;

    if (!template || !subject || !contacts) {
      return res.status(400).json({
        success: false,
        error: 'Template, subject, and contacts are required'
      });
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Contacts must be a non-empty array'
      });
    }

    // Generate personalized emails
    const personalizedEmails = contacts.map((contact, index) => {
      try {
        // Get company info if available
        const companyData = contact.company || apolloService.extractCompanyInfo(contact) || {};
        
        // Generate personalized content
        const personalizedSubject = emailService.generatePersonalizedEmail(
          subject, 
          contact, 
          companyData, 
          customData
        );
        
        const personalizedBody = emailService.generatePersonalizedEmail(
          template, 
          contact, 
          companyData, 
          customData
        );

        return {
          to: contact.email,
          subject: personalizedSubject,
          html: personalizedBody.replace(/\n/g, '<br>'),
          text: personalizedBody,
          from,
          replyTo,
          contactData: {
            name: contact.fullName || contact.name,
            company: companyData.name || contact.company?.name || contact.companyName
          }
        };
      } catch (error) {
        console.error(`Error personalizing email for contact ${index}:`, error);
        return null;
      }
    }).filter(email => email !== null && email.to); // Filter out invalid emails

    if (personalizedEmails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid emails could be generated from the provided contacts'
      });
    }

    // Send bulk emails
    const result = await emailService.sendBulkEmails(personalizedEmails, delayMs);
    
    res.json({
      success: true,
      message: 'Personalized bulk email sending completed',
      totalContacts: contacts.length,
      validEmails: personalizedEmails.length,
      totalSent: result.totalSent,
      successCount: result.successCount,
      failureCount: result.failureCount,
      results: result.results.map(r => ({
        ...r,
        contactName: personalizedEmails[r.index]?.contactData?.name,
        contactCompany: personalizedEmails[r.index]?.contactData?.company
      }))
    });

  } catch (error) {
    console.error('Personalized bulk email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during personalized bulk email sending'
    });
  }
});

/**
 * @route POST /api/email/preview-personalized
 * @desc Preview personalized email without sending
 */
router.post('/preview-personalized', async (req, res) => {
  try {
    const { template, subject, contact, customData = {} } = req.body;

    if (!template || !subject || !contact) {
      return res.status(400).json({
        success: false,
        error: 'Template, subject, and contact are required'
      });
    }

    // Get company info if available
    const companyData = contact.company || apolloService.extractCompanyInfo(contact) || {};
    
    // Generate personalized content
    const personalizedSubject = emailService.generatePersonalizedEmail(
      subject, 
      contact, 
      companyData, 
      customData
    );
    
    const personalizedBody = emailService.generatePersonalizedEmail(
      template, 
      contact, 
      companyData, 
      customData
    );

    res.json({
      success: true,
      preview: {
        to: contact.email,
        subject: personalizedSubject,
        body: personalizedBody,
        html: personalizedBody.replace(/\n/g, '<br>'),
        personData: {
          firstName: contact.firstName || contact.first_name,
          lastName: contact.lastName || contact.last_name,
          fullName: contact.fullName || contact.name,
          title: contact.title,
          email: contact.email,
          company: companyData.name || contact.companyName
        }
      }
    });

  } catch (error) {
    console.error('Email preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during email preview'
    });
  }
});

/**
 * @route GET /api/email/template-guide
 * @desc Get email template guide and examples
 */
router.get('/template-guide', (req, res) => {
  const guide = emailService.getTemplateGuide();
  res.json({
    success: true,
    data: guide
  });
});

/**
 * @route POST /api/email/test
 * @desc Send a test email to verify configuration
 */
router.post('/test', async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        error: 'Test email address is required'
      });
    }

    const result = await emailService.sendTestEmail(testEmail);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        to: testEmail,
        messageId: result.messageId
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while sending test email'
    });
  }
});

/**
 * @route GET /api/email/validate-config
 * @desc Validate email service configuration
 */
router.get('/validate-config', async (req, res) => {
  try {
    const result = await emailService.validateConfiguration();
    res.json(result);
  } catch (error) {
    console.error('Config validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during configuration validation'
    });
  }
});

/**
 * @route POST /api/email/bulk-send
 * @desc Send bulk emails from CSV file upload
 */
router.post('/bulk-send', upload.single('csvFile'), async (req, res) => {
  try {
    const { subject, template } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required'
      });
    }

    if (!subject || !template) {
      return res.status(400).json({
        success: false,
        error: 'Subject and template are required'
      });
    }

    // Parse CSV file
    const contacts = [];
    const csvFilePath = req.file.path;

    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Normalize email field names (email, Email, email_address, etc.)
        const email = row.email || row.Email || row.email_address || row['Email Address'] || row.to;
        const name = row.name || row.Name || row.first_name || row['First Name'] || 'Sir/Madam';
        const company = row.company || row.Company || row.organization || row.Organization || '';
        
        if (email) {
          contacts.push({
            email: email.trim(),
            name: name.trim(),
            company: company.trim()
          });
        }
      })
      .on('end', async () => {
        try {
          // Clean up uploaded file
          fs.unlinkSync(csvFilePath);

          if (contacts.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'No valid email addresses found in CSV file'
            });
          }

          // Generate personalized emails for each contact
          const emails = contacts.map(contact => {
            // Simple template personalization
            let personalizedTemplate = template
              .replace(/\{name\}/g, contact.name)
              .replace(/\{company\}/g, contact.company)
              .replace(/\{email\}/g, contact.email);

            let personalizedSubject = subject
              .replace(/\{name\}/g, contact.name)
              .replace(/\{company\}/g, contact.company);

            return {
              to: contact.email,
              subject: personalizedSubject,
              html: personalizedTemplate.replace(/\n/g, '<br>'),
              text: personalizedTemplate
            };
          });

          // Send bulk emails
          const result = await emailService.sendBulkEmails(emails, 2000); // 2 second delay between emails

          res.json({
            success: true,
            message: 'Bulk email sending completed',
            totalContacts: contacts.length,
            totalSent: result.successCount,
            failureCount: result.failureCount,
            results: result.results
          });

        } catch (error) {
          console.error('Bulk email processing error:', error);
          res.status(500).json({
            success: false,
            error: 'Error processing bulk emails'
          });
        }
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        // Clean up uploaded file
        try {
          fs.unlinkSync(csvFilePath);
        } catch (e) {}
        
        res.status(400).json({
          success: false,
          error: 'Error parsing CSV file'
        });
      });

  } catch (error) {
    console.error('Bulk email upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk email upload'
    });
  }
});

module.exports = router;
