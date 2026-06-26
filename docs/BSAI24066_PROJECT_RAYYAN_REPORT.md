# SkillLoop Project Report

**Student Name:** Muhammad Rayyan Malik  
**Roll Number:** BSAI24066  
**Project Title:** SkillLoop — A Peer-to-Peer Knowledge Exchange & Circular Matching System  
**GitHub Repository:** https://github.com/Takku1001/SkillLoop

## Project Explanation

SkillLoop is a peer-to-peer skill exchange platform designed to help students trade knowledge instead of only searching for direct one-way tutoring. A user can list skills they can teach, skills they want to learn, and the system can then identify direct matches as well as circular trade cycles where several students can help each other in a chain.

The project is built as a full-stack web application using Node.js, Express, PostgreSQL on Supabase, and a vanilla JavaScript frontend. It now supports authentication, profile viewing, skill matching, cycle discovery, and a public landing page with separate login and signup modals.

## What Has Been Completed

- Designed and implemented the database schema for users, skills, offerings, requests, sessions, reviews, and reputation tracking.
- Connected the backend to Supabase/PostgreSQL and verified that the API works with the live cloud database.
- Built Express routes for users, login, profiles, trade cycles, sessions, reviews, and reputation.
- Added secure password handling with signup and login support.
- Implemented a profile endpoint that returns a user’s offerings, requests, sessions, and reputation data.
- Implemented a cycle-expansion endpoint to map trade chains into readable skill exchanges.
- Built the frontend landing page with top-right Login and Sign Up buttons.
- Created separate login and signup modal screens instead of using a single full-page auth overlay.
- Added login error handling so invalid credentials are shown clearly without refreshing the page.
- Added UI support for viewing other users’ profiles and cycle details.
- Added seed data and verified that the app can read and write records successfully.
- Tested the system end to end, including successful signup, login, and persistence in Supabase.

## Current Status

The core backend and authentication flow are working, and the user interface now presents SkillLoop as a proper public web app with a landing page first. A user can sign up, log in, view their dashboard, and interact with matching features. The project is now in a presentation-ready state.

## What We Will Do Next

- Finish the sessions and reviews UI flow so users can move from matching to booking sessions and leaving feedback in one complete flow.
- Polish the README for final submission by adding setup steps, features, and a short guide for running the project.
- Export the final report as a PDF using the required submission filename.
- Review the responsive design, spacing, and contrast so the app looks neat on different screen sizes.
- Run one final end-to-end test for signup, login, profile viewing, and match rendering before submission.

