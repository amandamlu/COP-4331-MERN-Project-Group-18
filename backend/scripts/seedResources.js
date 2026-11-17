require('dotenv').config(); 

const mongoose = require('mongoose'); 
const Resource = require('../models/Resource'); 

const resources = [
    {
        // Finding Internships
        Title: 'Handshake', 
        Description: 'Find internships and entry-level job opportunities.', 
        Category: 'Finding Internships', 
        URL: 'https://joinhandshake.com/'
    },
    
    {
    Title: 'Wellfound',
    Description: 'Find job and internship opportunities at startups.',
    Category: 'Finding Internships',
    URL: 'https://wellfound.com/jobs'
    },

    {
        Title: 'Internships.com',
        Description: 'Browse internships by field, location, and company.',
        Category: 'Finding Internships',
        URL: 'https://www.internships.com/browse'
    },

    {
        Title: 'Indeed Internships',
        Description: 'Search for internship opportunities across industries.',
        Category: 'Finding Internships',
        URL: 'https://www.indeed.com/q-internship-search-jobs.html'
    },

    {
        Title: 'LinkedIn Jobs', 
        Description: 'Search for internships, jobs, and career opportunities.', 
        Category: 'Finding Internships', 
        URL: 'https://www.linkedin.com/jobs/'
    }, 

    // Resumes and Applications
    {
        Title: 'Harvard Resume Guide', 
        Description: 'Learn how to create a professional resume.', 
        Category: 'Resumes and Applications', 
        URL: 'https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/'
    }, 

    {
        Title: 'Harvard Cover Letter Guide', 
        Description: 'Learn how to write an effective cover letter.', 
        Category: 'Resumes and Applications', 
        URL: 'https://careerservices.fas.harvard.edu/blog/2026/08/10/how-to-write-a-cover-letter-that-actually-gets-you-hired-in-2026/'
    }, 

    {
        Title: 'Indeed Resume Samples',
        Description: 'Explore resume examples for different careers.',
        Category: 'Resumes and Applications',
        URL: 'https://www.indeed.com/career-advice/resume-samples'
    },
    
    {
        Title: 'Harvard Resume and Cover Letter Resources',
        Description: 'Find resume templates and cover letter guidance.',
        Category: 'Resumes and Applications',
        URL: 'https://careerservices.fas.harvard.edu/channels/create-a-resume-cv-or-cover-letter/'
    },

    {
        Title: 'Indeed Resume Tips',
        Description: 'Learn what information to include on your resume.',
        Category: 'Resumes and Applications',
        URL: 'https://www.indeed.com/career-advice/resumes-cover-letters/what-to-include-on-a-resume'
    },

    // Interview Preparation
    {
        Title: 'LeetCode', 
        Description: 'Practice coding problems for technical interviews.', 
        Category: 'Interview Preparation', 
        URL: 'https://leetcode.com'
    }, 

    {
        Title: 'HackerRank Interview Preparation',
        Description: 'Practice technical interview coding challenges.',
        Category: 'Interview Preparation',
        URL: 'https://www.hackerrank.com/interview/interview-preparation-kit'
    },

    {
        Title: 'Harvard Interviewing Guide',
        Description: 'Learn techniques for preparing for job interviews.',
        Category: 'Interview Preparation',
        URL: 'https://careerservices.fas.harvard.edu/resources/interviewing/'
    },

    {
        Title: 'Exercism',
        Description: 'Improve programming skills through coding exercises.',
        Category: 'Interview Preparation',
        URL: 'https://exercism.org/'
    },
    
    {
        Title: 'Pramp',
        Description: 'Practice mock interviews with peers through Aced Practice.',
        Category: 'Interview Preparation',
        URL: 'https://www.pramp.com/'
    },

    // Career Development
    
    {
        Title: 'Google Career Certificates', 
        Description: 'Explore professional certificates and career skills.', 
        Category: 'Career Development', 
        URL: 'https://grow.google/certificates/'
    },

    {
        Title: 'freeCodeCamp',
        Description: 'Learn programming through coding lessons and projects.',
        Category: 'Career Development',
        URL: 'https://www.freecodecamp.org/'
    },

    {
        Title: 'GitHub Skills',
        Description: 'Learn GitHub workflows through interactive exercises.',
        Category: 'Career Development',
        URL: 'https://skills.github.com/'
    },

    {
        Title: 'Developer Roadmaps',
        Description: 'Explore structured learning paths for technical careers.',
        Category: 'Career Development',
        URL: 'https://roadmap.sh/'
    },
    
    {
        Title: 'Coursera Professional Certificates',
        Description: 'Explore courses and certificates for professional skills.',
        Category: 'Career Development',
        URL: 'https://www.coursera.org/certificates/launch-your-career'
    }
]; 

const seedResources = async() => {
    try {
        await mongoose.connect(process.env.MONGO_URI); 

        for (const resource of resources) {
            await Resource.updateOne(
                {URL: resource.URL}, 
                {$setOnInsert: resource}, 
                {upsert: true}
            ); 
        }

        console.log('Resources seeded successfully.'); 
    } catch (error) {
        console.error('Error seeding resources:', error); 
        process.exitCode = 1; 
    } finally {
        await mongoose.disconnect(); 
    }
}; 

seedResources(); 