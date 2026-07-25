# CLAUDE_PROJECT_CONTEXT

## Project Overview
Existing system already contains:
- Dashboard
- Website
- Products module
- Orders module
- Existing n8n workflows
- Existing database

### Critical Rules
- NEVER rebuild existing features.
- Inspect current codebase before changing anything.
- Extend existing database using migrations only.
- Reuse existing services, APIs and workflows.
- Do not break backward compatibility.

## New Module: AI Studio

Goal:
Create an AI-powered creative and marketing module for a mobile phone case business.

Features:
1. Trend discovery (Pinterest, Etsy, TikTok, Instagram, Google Trends, Reddit, Amazon).
2. AI analyzes trends and stores them.
3. Generate unique design ideas.
4. Prevent duplicates.
5. Save ideas in database.
6. Telegram approval workflow.
7. AI revision loop.
8. Generate photorealistic product images and mockups.
9. Generate marketing copy.
10. Prepare Meta Ads drafts.
11. Analyze ad performance.
12. Learn from historical data.

## Existing Database
Do NOT replace existing tables.
Add new tables only if needed:
- trends
- design_ideas
- design_versions
- generated_assets
- marketing_content
- ad_campaigns
- analytics
- ai_memory

Link all ideas to existing products when approved.

## Product Flow

Trend
-> Idea
-> Telegram Approval
-> Image Generation
-> Product Creation
-> Existing Products Table
-> Website
-> Ads
-> Analytics
-> AI Memory

## Image Standards

Images MUST be:
- Photorealistic
- Premium commercial quality
- Studio lighting
- 8K
- Correct phone proportions
- Correct camera cutouts
- Luxury product photography
- White background
- Lifestyle mockups
- Transparent PNG
- Ready for Meta Ads

Never generate low-quality or cartoon-like product renders unless explicitly requested.

## AI Agents

Trend Hunter
Market Research
Design Director
Prompt Engineer
Mockup Director
Marketing Manager
Ads Manager
Business Analyst

Claude should create separate services/modules for each responsibility.

## Telegram

Support:
Approve
Reject
Edit
Regenerate
Favorite
Publish


## n8n

Reuse existing workflows.
Create new workflows only when required.
Keep workflows modular.

## Final Goal

Turn the existing dashboard into a complete AI-powered operating system for managing a phone case business from trend discovery to product publication and performance optimization.

Before implementing:
1. Analyze the repository.
2. Produce an implementation plan.
3. Break work into tasks.
4. Implement incrementally.
5. Never remove existing functionality.
