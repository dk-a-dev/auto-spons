const nodemailer = require('nodemailer');
const emailConfigDb = require('../utils/emailConfigDb');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.setupTransporter();
  }

  setupTransporter() {
    try {
      let config = emailConfigDb.readConfig();
      if (!config.host) {
        config = {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          from: process.env.SMTP_FROM || process.env.SMTP_USER
        };
      } else {
        config = {
          host: config.host,
          port: parseInt(config.port),
          secure: !!config.secure,
          auth: {
            user: config.user,
            pass: config.pass
          },
          from: config.from
        };
      }
      if (!config.auth.user || !config.auth.pass) {
        console.warn('SMTP credentials not found. Please configure SMTP_USER and SMTP_PASS in environment variables or save config.');
        return;
      }
      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      this.config = config;
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('SMTP connection error:', error);
          this.isConfigured = false;
        } else {
          console.log('SMTP server is ready to send emails');
        }
      });
    } catch (error) {
      console.error('Failed to setup email transporter:', error);
      this.isConfigured = false;
    }
  }

  reloadConfig() {
    this.setupTransporter();
  }

  /**
   * Send a single email
   * @param {Object} emailData - Email configuration
   */
  async sendEmail(emailData) {
    try {
      if (!this.isConfigured) {
        throw new Error('Email service is not properly configured');
      }

      const {
        to,
        subject,
        text,
        html,
        from = process.env.SMTP_FROM || process.env.SMTP_USER,
        replyTo = process.env.SMTP_REPLY_TO,
        attachments = []
      } = emailData;

      if (!to || !subject || (!text && !html)) {
        throw new Error('Missing required email fields: to, subject, and content (text or html)');
      }

      const mailOptions = {
        from,
        to,
        subject,
        text,
        html,
        replyTo,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
        to,
        subject
      };

    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error.message,
        to: emailData.to,
        subject: emailData.subject
      };
    }
  }

  /**
   * Send bulk emails with delay to avoid rate limiting
   * @param {Array} emailList - Array of email configurations
   * @param {number} delayMs - Delay between emails in milliseconds
   */
  async sendBulkEmails(emailList, delayMs = 1000) {
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < emailList.length; i++) {
      const emailData = emailList[i];
      
      try {
        const result = await this.sendEmail(emailData);
        results.push({
          index: i,
          email: emailData.to,
          ...result
        });

        if (result.success) {
          successCount++;
          console.log(`✓ Email ${i + 1}/${emailList.length} sent to ${emailData.to}`);
        } else {
          failureCount++;
          console.log(`✗ Email ${i + 1}/${emailList.length} failed to ${emailData.to}: ${result.error}`);
        }

        // Add delay between emails to avoid rate limiting
        if (i < emailList.length - 1 && delayMs > 0) {
          await this.delay(delayMs);
        }

      } catch (error) {
        failureCount++;
        results.push({
          index: i,
          email: emailData.to,
          success: false,
          error: error.message
        });
        console.log(`✗ Email ${i + 1}/${emailList.length} failed to ${emailData.to}: ${error.message}`);
      }
    }

    return {
      success: true,
      totalSent: emailList.length,
      successCount,
      failureCount,
      results
    };
  }

  /**
   * Generate personalized email content from template
   * @param {string} template - Email template with placeholders
   * @param {Object} personData - Person data for personalization
   * @param {Object} companyData - Company data for personalization
   * @param {Object} customData - Additional custom data
   */
  generatePersonalizedEmail(template, personData, companyData = {}, customData = {}) {
    let personalizedContent = template;

    // Replace person placeholders (both formats)
    const personPlaceholders = {
      // Curly braces format
      '{{firstName}}': personData.firstName || personData.first_name || '',
      '{{lastName}}': personData.lastName || personData.last_name || '',
      '{{fullName}}': personData.fullName || personData.name || `${personData.firstName || ''} ${personData.lastName || ''}`.trim(),
      '{{title}}': personData.title || '',
      '{{email}}': personData.email || '',
      '{{linkedinUrl}}': personData.linkedinUrl || personData.linkedin_url || '',
      '{{location}}': personData.location ? `${personData.location.city || ''}, ${personData.location.state || ''}`.replace(', ,', ',').trim() : '',
      '{{city}}': personData.location?.city || personData.city || '',
      '{{state}}': personData.location?.state || personData.state || '',
      '{{country}}': personData.location?.country || personData.country || '',
      
      // Square brackets format
      '[First_Name]': personData.firstName || personData.first_name || '',
      '[Last_Name]': personData.lastName || personData.last_name || '',
      '[Full_Name]': personData.fullName || personData.name || `${personData.firstName || ''} ${personData.lastName || ''}`.trim(),
      '[Title]': personData.title || '',
      '[Email]': personData.email || '',
      '[LinkedIn_URL]': personData.linkedinUrl || personData.linkedin_url || '',
      '[Location]': personData.location ? `${personData.location.city || ''}, ${personData.location.state || ''}`.replace(', ,', ',').trim() : '',
      '[City]': personData.location?.city || personData.city || '',
      '[State]': personData.location?.state || personData.state || '',
      '[Country]': personData.location?.country || personData.country || ''
    };

    // Replace company placeholders (both formats)
    const companyPlaceholders = {
      // Curly braces format
      '{{companyName}}': companyData.name || '',
      '{{companyDomain}}': companyData.domain || '',
      '{{companyWebsite}}': companyData.website || '',
      '{{companyIndustry}}': companyData.industry || '',
      '{{companyEmployeeCount}}': companyData.employeeCount || '',
      '{{companyLocation}}': companyData.location ? `${companyData.location.city || ''}, ${companyData.location.state || ''}`.replace(', ,', ',').trim() : '',
      '{{companyPhone}}': companyData.phone || '',
      
      // Square brackets format
      '[Company_Name]': companyData.name || '',
      '[Company_Domain]': companyData.domain || '',
      '[Company_Website]': companyData.website || '',
      '[Company_Industry]': companyData.industry || '',
      '[Company_Employee_Count]': companyData.employeeCount || '',
      '[Company_Location]': companyData.location ? `${companyData.location.city || ''}, ${companyData.location.state || ''}`.replace(', ,', ',').trim() : '',
      '[Company_Phone]': companyData.phone || ''
    };

    // Replace custom placeholders (both formats)
    const customPlaceholders = {};
    Object.keys(customData).forEach(key => {
      // Curly braces format
      customPlaceholders[`{{${key}}}`] = customData[key] || '';
      // Square brackets format
      customPlaceholders[`[${key}]`] = customData[key] || '';
    });

    // Apply all replacements
    const allPlaceholders = {
      ...personPlaceholders,
      ...companyPlaceholders,
      ...customPlaceholders
    };

    Object.keys(allPlaceholders).forEach(placeholder => {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      personalizedContent = personalizedContent.replace(regex, allPlaceholders[placeholder]);
    });

    return personalizedContent;
  }

  /**
   * Create email template with common placeholders guide
   */
  getTemplateGuide() {
    return {
      supportedFormats: [
        '{{variable}} - Curly braces format',
        '[Variable_Name] - Square brackets format (recommended)'
      ],
      personPlaceholders: [
        '{{firstName}} or [First_Name]',
        '{{lastName}} or [Last_Name]',
        '{{fullName}} or [Full_Name]',
        '{{title}} or [Title]',
        '{{email}} or [Email]',
        '{{linkedinUrl}} or [LinkedIn_URL]',
        '{{location}} or [Location]',
        '{{city}} or [City]',
        '{{state}} or [State]',
        '{{country}} or [Country]'
      ],
      companyPlaceholders: [
        '{{companyName}} or [Company_Name]',
        '{{companyDomain}} or [Company_Domain]',
        '{{companyWebsite}} or [Company_Website]',
        '{{companyIndustry}} or [Company_Industry]',
        '{{companyEmployeeCount}} or [Company_Employee_Count]',
        '{{companyLocation}} or [Company_Location]',
        '{{companyPhone}} or [Company_Phone]'
      ],
      customPlaceholders: [
        '[Event_Name] - Name of your event',
        '[Organization_Name] - Your organization name',
        '[Sender_Name] - Name of the person sending',
        '[Event_Date] - Date of your event',
        '[Event_Location] - Event venue/location',
        '[Event_Brochure_Link] - Link to event brochure',
        '[Social_Links] - Your social media links',
        '[Contact_Information] - Your contact details'
      ],
      gdscTemplate: {
        subject: "Partnership Opportunity with [Event_Name] - [Organization_Name]",
        body: `Dear Sir/Madam,

I hope this email finds you well.

I'm [Sender_Name], a manager at the Google Developer Students Club (GDSC) at VIT Vellore.

We are thrilled to announce the eighth edition of [Event_Name], our flagship hackathon! As a cornerstone of graVITas, VIT's biggest annual tech-fest, our event taps into VIT's vibrant 40,000-strong student community.

This 48-hour innovation sprint will bring together over 600 student developers to build out-of-the-box solutions to real-world challenges. We'd love to have [Company_Name] on board to drive [Event_Name] to new heights of innovation and impact.

For our partners, this provides a direct line to showcase your brand and technology, building invaluable connections with a highly motivated audience. Our Instagram community has grown to over 9k followers, and we'd love to explore how we can align this partnership with your goals.

Your support, monetary or in-kind, will not only elevate [Event_Name] but also enable us to broaden our reach to more students and reward them. You may refer to the event brochure at the following link for more information, [Event_Brochure_Link] .

If you feel this resonates with your goals, please get back to us. You can also visit our website or check out our socials to see our community in action via the following link [Social_Links] .

Thank you for considering this opportunity to support [Event_Name]. We look forward to hearing from you soon!

Best regards,
[Sender_Name]
Manager, GDSC-VIT
[Contact_Information]`
      },
      exampleTemplate: `Subject: Partnership Opportunity with {{companyName}}

Hi {{firstName}},

I hope this email finds you well. I came across {{companyName}} and was impressed by your work in {{companyIndustry}}.

As {{title}} at {{companyName}}, you might be interested in a partnership opportunity that could benefit your team.

Best regards,
[Your Name]

P.S. I'd love to connect on LinkedIn if you're open to it: {{linkedinUrl}}`
    };
  }

  /**
   * Validate email configuration
   */
  async validateConfiguration() {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Email service is not configured'
        };
      }

      await this.transporter.verify();
      return {
        success: true,
        message: 'Email configuration is valid'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test email sending with a simple test message
   * @param {string} testEmail - Email address to send test to
   */
  async sendTestEmail(testEmail) {
    const testEmailData = {
      to: testEmail,
      subject: 'Auto-Spons Email Service Test',
      text: 'This is a test email from the Auto-Spons application. If you received this, your email configuration is working correctly!',
      html: `
        <h2>Auto-Spons Email Service Test</h2>
        <p>This is a test email from the Auto-Spons application.</p>
        <p>If you received this, your email configuration is working correctly!</p>
        <p><strong>Test sent at:</strong> ${new Date().toISOString()}</p>
      `
    };

    return await this.sendEmail(testEmailData);
  }
}

module.exports = EmailService;
