# Auto-Spons 🚀

An automated sponsorship outreach tool that helps teams find companies and send personalized emails automatically. Built with React frontend and Node.js backend, Gmail SMTP for sending emails.

## Features

- 📧 **Automated Email Campaigns** - Send personalized emails with customizable templates
- 📁 **Bulk Operations** - Upload CSV/Excel files for bulk email campaigns
- 🎯 **Smart Templates** - Dynamic email templates with variable substitution
- 🐳 **Docker Ready** - Easy deployment with Docker containers
- 🔒 **Secure Configuration** - Environment-based configuration management

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Gmail account with App Password (for SMTP)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd auto-spons
```

### 2. Configure Environment Variables

The application is pre-configured with the provided credentials. If you need to update them:

**Backend Configuration** (`.env`):
```bash
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000


# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
FROM_NAME=Auto-Spons
FROM_EMAIL=
```

### 3. Start the Application

#### Option 1: Using the Startup Script (Recommended)
```bash
./start.sh
```

#### Option 2: Using Docker Compose Directly
```bash
docker-compose up --build
```

#### Option 3: Development Mode
```bash
# Start backend
cd backend
npm install
npm run dev

# Start frontend (in another terminal)
cd frontend
npm install
npm start
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs

## How to Use
### 1. Customize Email Templates

1. Go to the **Email Templates** tab
2. Edit the default template or create a new one
3. Use variables like `{Company_Name}`, `{Event_Name}`, `{Person_Name}` for personalization
4. Configure your event details (event name, date, etc.)

### 2. Send Bulk Emails

1. Go to the **Bulk Email** tab
2. Either:
   - Upload a CSV/Excel file with contact information
3. Preview the personalized emails
4. Send the campaign

### 3. Configuration

1. Go to the **Configuration** tab
2. Update your email settings if needed
3. Test your email configuration

## Email Template Variables

You can use these variables in your email templates:

- `[Company_Name]` - Company name
- `[Person_Name]` - Contact person's full name
- `[First_Name]` - Contact person's first name
- `[Last_Name]` - Contact person's last name
- `[Event_Name]` - Your event name
- `[Event_Date]` - Your event date
- `[Organization_Name]` - Your organization name
- `[Website_Link]` - Your website/social links
- `[Email]` - Contact person's email
- `[Title]` - Contact person's job title

## Example Email Template

```
Dear Sir/Madam,

I hope this email finds you well.

I'm [Your_Name], a manager at the [Organization_Name].

We are thrilled to announce the eighth edition of [Event_Name], our flagship hackathon! As a cornerstone of graVITas, VIT's biggest annual tech-fest, our event taps into VIT's vibrant 40,000-strong student community.

This 48-hour innovation sprint will bring together over 600 student developers to build out-of-the-box solutions to real-world challenges. We'd love to have [Company_Name] on board to drive [Event_Name] to new heights of innovation and impact.

For our partners, this provides a direct line to showcase your brand and technology, building invaluable connections with a highly motivated audience. Our Instagram community has grown to over 9k followers, and we'd love to explore how we can align this partnership with your goals.

Your support, monetary or in-kind, will not only elevate [Event_Name] but also enable us to broaden our reach to more students and reward them. You may refer to the event brochure at the following link for more information, [Website_Link].

If you feel this resonates with your goals, please get back to us. You can also visit our website or check out our socials to see our community in action via the following link [Website_Link].

Thank you for considering this opportunity to support [Event_Name]. We look forward to hearing from you soon!

Best regards,
[Your_Name]
Manager, [Organization_Name]
```

## API Endpoints
### Email API
- `POST /api/email/send` - Send a single email
- `POST /api/email/send-bulk` - Send bulk emails
- `POST /api/email/send-personalized-bulk` - Send personalized bulk emails
- `POST /api/email/preview-personalized` - Preview personalized email
- `POST /api/email/test` - Send test email

### File Processing
- `POST /api/files/upload` - Upload and process CSV/Excel files
- `POST /api/files/preview` - Preview file contents
- `POST /api/files/export` - Export data to CSV

## Development

### Project Structure

```
auto-spons/
├── backend/                 # Node.js/Express backend
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── .env               # Environment variables
│   └── server.js          # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   └── App.js        # Main app component
│   └── .env              # Frontend environment variables
├── docker-compose.yml     # Docker configuration
└── start.sh              # Startup script
```

### Logs

To view application logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

## Docker Deployment (Self-Hosted)

### 1. Build and Start All Services

```bash
docker-compose up --build
```

- The backend will be available at [http://localhost:3001](http://localhost:3001)
- The frontend will be available at [http://localhost:3000](http://localhost:3000)

### 2. Stopping Services

```bash
docker-compose down
```

### 3. Updating Environment Variables
- Edit `backend/.env` for backend config (SMTP, etc.)
- Rebuild containers if you change `.env`:
  ```bash
  docker-compose up --build
  ```

---

## Usage
- Access the frontend at [http://localhost:3000](http://localhost:3000)
- Configure SMTP, manage templates, upload CSVs, and send bulk emails via the UI.
- Check logs and email status in the Email Logs tab.

---

**Happy Sponsorship Hunting! 🎯**
