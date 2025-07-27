const express = require('express');
const ApolloService = require('../services/apolloService');
const router = express.Router();

const apolloService = new ApolloService();

/**
 * @route POST /api/apollo/search-people
 * @desc Search for people/prospects
 */
router.post('/search-people', async (req, res) => {
  try {
    const searchParams = req.body;

    if (!searchParams || Object.keys(searchParams).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search parameters are required'
      });
    }

    const result = await apolloService.searchPeople(searchParams);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        totalPeople: result.totalPeople,
        message: `Found ${result.totalPeople} people matching your criteria`
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('People search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during people search'
    });
  }
});

/**
 * @route POST /api/apollo/search-organizations
 * @desc Search for organizations/companies
 */
router.post('/search-organizations', async (req, res) => {
  try {
    const searchParams = req.body;

    if (!searchParams || Object.keys(searchParams).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search parameters are required'
      });
    }

    const result = await apolloService.searchOrganizations(searchParams);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        totalOrganizations: result.totalOrganizations,
        message: `Found ${result.totalOrganizations} organizations matching your criteria`
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Organization search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during organization search'
    });
  }
});

/**
 * @route POST /api/apollo/search-contacts
 * @desc Search for contacts using Apollo API
 */
router.post('/search-contacts', async (req, res) => {
  try {
    const searchParams = req.body;

    if (!searchParams || Object.keys(searchParams).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search parameters are required'
      });
    }

    const result = await apolloService.searchContacts(searchParams);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        totalContacts: result.totalResults,
        message: `Found ${result.totalResults} contacts matching your criteria`
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Contact search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during contact search'
    });
  }
});

/**
 * @route POST /api/apollo/enrich-person
 * @desc Enrich a single person's data
 */
router.post('/enrich-person', async (req, res) => {
  try {
    const { personData, options = {} } = req.body;

    if (!personData) {
      return res.status(400).json({
        success: false,
        error: 'Person data is required'
      });
    }

    const result = await apolloService.enrichPerson(personData, options);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        creditsConsumed: result.creditsConsumed,
        formatted: apolloService.formatPersonForEmail(result.data)
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Person enrichment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during person enrichment'
    });
  }
});

/**
 * @route POST /api/apollo/enrich-people-bulk
 * @desc Enrich multiple people's data (up to 10)
 */
router.post('/enrich-people-bulk', async (req, res) => {
  try {
    const { peopleData, options = {} } = req.body;

    if (!peopleData || !Array.isArray(peopleData)) {
      return res.status(400).json({
        success: false,
        error: 'People data must be an array'
      });
    }

    if (peopleData.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 people can be enriched in a single request'
      });
    }

    const result = await apolloService.enrichPeopleBulk(peopleData, options);
    
    if (result.success) {
      // Format people data for emails
      const formattedPeople = result.data.matches ? 
        result.data.matches.map(person => apolloService.formatPersonForEmail({ person })) : [];

      res.json({
        success: true,
        data: result.data,
        totalRequested: result.totalRequested,
        uniqueEnriched: result.uniqueEnriched,
        missingRecords: result.missingRecords,
        creditsConsumed: result.creditsConsumed,
        formattedPeople
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Bulk people enrichment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk people enrichment'
    });
  }
});

/**
 * @route POST /api/apollo/enrich-organization
 * @desc Enrich a single organization's data
 */
router.post('/enrich-organization', async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required'
      });
    }

    const result = await apolloService.enrichOrganization(domain);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        creditsConsumed: result.creditsConsumed,
        companyInfo: apolloService.extractCompanyInfo(result.data)
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Organization enrichment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during organization enrichment'
    });
  }
});

/**
 * @route POST /api/apollo/enrich-organizations-bulk
 * @desc Enrich multiple organizations' data (up to 10)
 */
router.post('/enrich-organizations-bulk', async (req, res) => {
  try {
    const { domains } = req.body;

    if (!domains || !Array.isArray(domains)) {
      return res.status(400).json({
        success: false,
        error: 'Domains must be an array'
      });
    }

    if (domains.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 organizations can be enriched in a single request'
      });
    }

    const result = await apolloService.enrichOrganizationsBulk(domains);
    
    if (result.success) {
      // Extract company info for each organization
      const companiesInfo = result.data.organizations ? 
        result.data.organizations.map(org => apolloService.extractCompanyInfo({ organization: org })) : [];

      res.json({
        success: true,
        data: result.data,
        totalRequested: result.totalRequested,
        creditsConsumed: result.creditsConsumed,
        companiesInfo
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Bulk organization enrichment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during bulk organization enrichment'
    });
  }
});

/**
 * @route GET /api/apollo/usage
 * @desc Get API usage statistics
 */
router.get('/usage', async (req, res) => {
  try {
    const result = await apolloService.getUsageStats();
    res.json(result);
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching usage stats'
    });
  }
});

/**
 * @route GET /api/apollo/template-guide
 * @desc Get template placeholders guide
 */
router.get('/template-guide', (req, res) => {
  const guide = {
    personPlaceholders: [
      { placeholder: '{{firstName}}', description: 'First name of the person' },
      { placeholder: '{{lastName}}', description: 'Last name of the person' },
      { placeholder: '{{fullName}}', description: 'Full name of the person' },
      { placeholder: '{{title}}', description: 'Job title/position' },
      { placeholder: '{{email}}', description: 'Email address' },
      { placeholder: '{{linkedinUrl}}', description: 'LinkedIn profile URL' },
      { placeholder: '{{location}}', description: 'City, State location' },
      { placeholder: '{{city}}', description: 'City' },
      { placeholder: '{{state}}', description: 'State/Province' },
      { placeholder: '{{country}}', description: 'Country' }
    ],
    companyPlaceholders: [
      { placeholder: '{{companyName}}', description: 'Company name' },
      { placeholder: '{{companyDomain}}', description: 'Company domain' },
      { placeholder: '{{companyWebsite}}', description: 'Company website URL' },
      { placeholder: '{{companyIndustry}}', description: 'Company industry' },
      { placeholder: '{{companyEmployeeCount}}', description: 'Number of employees' },
      { placeholder: '{{companyLocation}}', description: 'Company location' },
      { placeholder: '{{companyPhone}}', description: 'Company phone number' }
    ],
    exampleTemplates: {
      sponsorship: {
        subject: 'Partnership Opportunity with {{companyName}}',
        body: `Hi {{firstName}},

I hope this email finds you well. I came across {{companyName}} and was impressed by your work in {{companyIndustry}}.

As {{title}} at {{companyName}}, you might be interested in exploring a partnership opportunity with our upcoming event. We believe this collaboration could provide valuable exposure for {{companyName}} while supporting our community initiative.

Would you be available for a brief 15-minute call this week to discuss how we might work together?

Best regards,
[Your Name]

P.S. I'd love to connect on LinkedIn: {{linkedinUrl}}`
      },
      networking: {
        subject: 'Quick question about {{companyName}}',
        body: `Hi {{firstName}},

I've been following {{companyName}}'s growth in {{companyIndustry}} and would love to learn more about your experience as {{title}}.

Would you be open to a brief coffee chat or virtual meeting? I'm particularly interested in your insights on [specific topic].

Looking forward to connecting!

Best,
[Your Name]`
      }
    }
  };

  res.json({
    success: true,
    data: guide
  });
});

module.exports = router;
