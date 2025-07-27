const axios = require('axios');

class ApolloService {
  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY || 'absNfUQOBJVD2hYiSJ_amw';
    this.baseUrl = process.env.APOLLO_BASE_URL || 'https://api.apollo.io/api/v1';
    
    console.log('Apollo API configured with key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'Not found');
  }

  /**
   * Search for people using Apollo API
   * @param {Object} searchCriteria - Search parameters
   */
  async searchPeople(searchCriteria) {
    try {
      if (!this.apiKey) {
        throw new Error('Apollo API key is not configured');
      }

      const {
        // Organization filters
        organizationName,
        organizationDomain,
        organizationIndustries,
        organizationNumEmployeesRanges,
        organizationLocations,
        
        // Person filters
        personTitles,
        personSeniorities,
        personDepartments,
        personLocations,
        q, // General search query
        
        // Pagination
        page = 1,
        perPage = 25,
        
        // Data options
        revealPersonalEmails = false,
        revealPhoneNumber = false
      } = searchCriteria;

      const requestBody = {
        page,
        per_page: Math.min(perPage, 100), // Apollo max is 100
        reveal_personal_emails: revealPersonalEmails,
        reveal_phone_number: revealPhoneNumber
      };

      // Add organization filters if provided
      if (organizationName) {
        requestBody.organization_names = Array.isArray(organizationName) ? organizationName : [organizationName];
      }
      
      if (organizationDomain) {
        requestBody.organization_domain = organizationDomain;
      }
      
      if (organizationIndustries) {
        requestBody.organization_industries = Array.isArray(organizationIndustries) ? organizationIndustries : [organizationIndustries];
      }
      
      if (organizationNumEmployeesRanges) {
        requestBody.organization_num_employees_ranges = Array.isArray(organizationNumEmployeesRanges) ? organizationNumEmployeesRanges : [organizationNumEmployeesRanges];
      }
      
      if (organizationLocations) {
        requestBody.organization_locations = Array.isArray(organizationLocations) ? organizationLocations : [organizationLocations];
      }

      // Add person filters if provided
      if (personTitles) {
        requestBody.person_titles = Array.isArray(personTitles) ? personTitles : [personTitles];
      }
      
      if (personSeniorities) {
        requestBody.person_seniorities = Array.isArray(personSeniorities) ? personSeniorities : [personSeniorities];
      }
      
      if (personDepartments) {
        requestBody.person_departments = Array.isArray(personDepartments) ? personDepartments : [personDepartments];
      }
      
      if (personLocations) {
        requestBody.person_locations = Array.isArray(personLocations) ? personLocations : [personLocations];
      }

      // Add general search query
      if (q) {
        requestBody.q = q;
      }

      console.log('Searching Apollo with criteria:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(`${this.baseUrl}/mixed_people/search`, requestBody, {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      });

      const { data } = response;
      
      // Transform the response to a more user-friendly format
      const transformedPeople = data.people?.map(person => {
        const organization = person.organization || {};
        
        return {
          id: person.id,
          firstName: person.first_name,
          lastName: person.last_name,
          fullName: person.name,
          title: person.title,
          email: person.email,
          emailStatus: person.email_status,
          linkedinUrl: person.linkedin_url,
          photoUrl: person.photo_url,
          headline: person.headline,
          location: {
            city: person.city,
            state: person.state,
            country: person.country
          },
          company: {
            id: organization.id,
            name: organization.name,
            domain: organization.primary_domain,
            website: organization.website_url,
            industry: organization.industry,
            employeeCount: organization.estimated_num_employees,
            linkedinUrl: organization.linkedin_url,
            location: {
              city: organization.city,
              state: organization.state,
              country: organization.country,
              address: organization.raw_address
            },
            phone: organization.phone,
            foundedYear: organization.founded_year
          },
          departments: person.departments || [],
          seniority: person.seniority,
          isLikelyToEngage: person.is_likely_to_engage
        };
      }) || [];

      return {
        success: true,
        data: {
          people: transformedPeople,
          pagination: {
            page: data.pagination?.page || page,
            perPage: data.pagination?.per_page || perPage,
            totalEntries: data.pagination?.total_entries || 0,
            totalPages: data.pagination?.total_pages || 0
          },
          creditsUsed: data.credits_used || 0,
          requestId: data.request_id
        }
      };

    } catch (error) {
      console.error('Apollo People Search error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorCode: error.response?.status,
        details: error.response?.data
      };
    }
  }

  /**
   * Get available search filters for people search
   */
  getSearchFilters() {
    return {
      organizationFilters: {
        organizationName: {
          type: 'string or array',
          description: 'Company names to search for',
          example: ['Google', 'Microsoft', 'Apple']
        },
        organizationDomain: {
          type: 'string',
          description: 'Company domain to search for',
          example: 'google.com'
        },
        organizationIndustries: {
          type: 'array',
          description: 'Industries to filter by',
          options: [
            'technology',
            'software',
            'information technology & services',
            'computer software',
            'internet',
            'financial services',
            'banking',
            'consulting',
            'marketing & advertising',
            'retail',
            'healthcare',
            'education',
            'non-profit',
            'government'
          ]
        },
        organizationNumEmployeesRanges: {
          type: 'array',
          description: 'Employee count ranges',
          options: [
            '1,10',
            '11,50',
            '51,200',
            '201,500',
            '501,1000',
            '1001,5000',
            '5001,10000',
            '10001+'
          ]
        },
        organizationLocations: {
          type: 'array',
          description: 'Organization locations',
          example: ['San Francisco, CA', 'New York, NY', 'London, UK']
        }
      },
      personFilters: {
        personTitles: {
          type: 'array',
          description: 'Job titles to search for',
          example: ['CEO', 'CTO', 'VP Engineering', 'Marketing Manager', 'Founder']
        },
        personSeniorities: {
          type: 'array',
          description: 'Seniority levels',
          options: [
            'c_suite',
            'vp',
            'director',
            'manager',
            'senior',
            'entry'
          ]
        },
        personDepartments: {
          type: 'array',
          description: 'Departments',
          options: [
            'executive',
            'engineering',
            'marketing',
            'sales',
            'operations',
            'finance',
            'human_resources',
            'legal',
            'product',
            'customer_success'
          ]
        },
        personLocations: {
          type: 'array',
          description: 'Person locations',
          example: ['San Francisco, CA', 'New York, NY', 'Bangalore, India']
        }
      },
      generalFilters: {
        q: {
          type: 'string',
          description: 'General search query',
          example: 'startup founder AI'
        },
        page: {
          type: 'number',
          description: 'Page number for pagination',
          default: 1
        },
        perPage: {
          type: 'number',
          description: 'Results per page (max 100)',
          default: 25
        },
        revealPersonalEmails: {
          type: 'boolean',
          description: 'Whether to reveal personal emails (consumes credits)',
          default: false
        },
        revealPhoneNumber: {
          type: 'boolean',
          description: 'Whether to reveal phone numbers (consumes credits)',
          default: false
        }
      }
    };
  }

  /**
   * Get usage information for the Apollo API
   */
  async getUsage() {
    try {
      return {
        success: true,
        message: 'Apollo API is configured and ready to use',
        apiKey: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'Not configured',
        availableEndpoints: ['People Search'],
        limitations: [
          'Only People Search endpoint is available with this API key',
          'Maximum 100 results per page',
          'Rate limits apply based on your Apollo plan'
        ]
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate Apollo API configuration
   */
  async validateConfiguration() {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'Apollo API key is not configured'
        };
      }

      // Test with a simple search
      const testResult = await this.searchPeople({
        q: 'CEO',
        perPage: 1
      });

      if (testResult.success) {
        return {
          success: true,
          message: 'Apollo API configuration is valid',
          creditsUsed: testResult.data.creditsUsed || 0
        };
      } else {
        return {
          success: false,
          error: testResult.error || 'Failed to validate Apollo API configuration'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ApolloService;
