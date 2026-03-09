import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fetch from 'node-fetch';

dotenv.config();

// Check if Google Gemini key is available
if (!process.env.GEMINI_API_KEY) {
  console.log('ℹ️ GEMINI_API_KEY is not set, Gemini will be skipped if GROQ_API_KEY is available.');
} else {
  console.log('✅ GEMINI_API_KEY is configured');
}

// Check if Groq key is available
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (GROQ_API_KEY) {
  console.log('✅ GROQ_API_KEY is configured (will be preferred for AI generation)');
} else {
  console.log('ℹ️ GROQ_API_KEY is not set, using Gemini or fallback templates.');
}

// Initialize Gemini AI (used only when GROQ_API_KEY is not set)
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Helper: call Groq's OpenAI-compatible chat API
const generateWithGroq = async (prompt) => {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      // Use a current Groq model; you can change this string to any
      // supported model name from your Groq dashboard if needed.
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1100,
      temperature: 0.8,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status} ${response.statusText}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    content,
    usage: data.usage || {},
  };
};

// Function to fetch real-time cricket data from multiple APIs
const fetchCricketData = async (title) => {
  try {
    const cricketKeywords = ['match', 'score', 'player', 'tournament', 'series', 'world cup', 'ipl', 't20', 'odi', 'test', 'vs', 'cricket'];
    const hasCricketKeywords = cricketKeywords.some(keyword => 
      title.toLowerCase().includes(keyword)
    );
    
    if (!hasCricketKeywords) {
      return { hasCricketData: false };
    }

    console.log('🏏 Detected cricket-related content, fetching live data...');
    
    let cricketData = {
      hasCricketData: true,
      liveMatches: [],
      upcomingMatches: [],
      recentResults: [],
      playerStats: [],
      tournamentStandings: [],
      news: []
    };

    // Try multiple cricket APIs for comprehensive data
    try {
      // 1. ESPN Cricinfo API (Free, no API key required)
      console.log('📡 Fetching data from ESPN Cricinfo...');
      const espnResponse = await fetch('https://sports.core.api.espn.com/v2/sports/cricket/');
      if (espnResponse.ok) {
        const espnData = await espnResponse.json();
        if (espnData.events) {
          cricketData.liveMatches = espnData.events.filter(event => 
            event.status.type.name === 'STATUS_IN_PROGRESS' || 
            event.status.type.name === 'STATUS_HALFTIME'
          );
          cricketData.upcomingMatches = espnData.events.filter(event => 
            event.status.type.name === 'STATUS_SCHEDULED' || 
            event.status.type.name === 'STATUS_PRE'
          );
          cricketData.recentResults = espnData.events.filter(event => 
            event.status.type.name === 'STATUS_FINAL' || 
            event.status.type.name === 'STATUS_POST'
          );
        }
        console.log('✅ ESPN data fetched successfully');
      }
    } catch (espnError) {
      console.log('⚠️ ESPN API failed:', espnError.message);
    }

    // 2. CricAPI (Requires API key - add to .env)
    if (process.env.CRICAPI_KEY) {
      try {
        console.log('📡 Fetching data from CricAPI...');
        const cricapiResponse = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${process.env.CRICAPI_KEY}`);
        if (cricapiResponse.ok) {
          const cricapiData = await cricapiResponse.json();
          if (cricapiData.data) {
            cricketData.liveMatches = [...cricketData.liveMatches, ...cricapiData.data.filter(match => 
              match.matchType === 't20' || match.matchType === 'odi' || match.matchType === 'test'
            )];
          }
        }
        console.log('✅ CricAPI data fetched successfully');
      } catch (cricapiError) {
        console.log('⚠️ CricAPI failed:', cricapiError.message);
      }
    }

    // 3. Cricket API (cricket-api.com - requires API key)
    if (process.env.CRICKET_API_KEY) {
      try {
        console.log('📡 Fetching data from Cricket API...');
        const cricketApiResponse = await fetch(`https://cricket-api.com/api/matches?apikey=${process.env.CRICKET_API_KEY}`);
        if (cricketApiResponse.ok) {
          const cricketApiData = await cricketApiResponse.json();
          if (cricketApiData.data) {
            cricketData.upcomingMatches = [...cricketData.upcomingMatches, ...cricketApiData.data];
          }
        }
        console.log('✅ Cricket API data fetched successfully');
      } catch (cricketApiError) {
        console.log('⚠️ Cricket API failed:', cricketApiError.message);
      }
    }

    // 4. News API for cricket news (requires API key)
    if (process.env.NEWS_API_KEY) {
      try {
        console.log('📡 Fetching cricket news...');
        const newsResponse = await fetch(`https://newsapi.org/v2/everything?q=cricket&language=en&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}&pageSize=5`);
        if (newsResponse.ok) {
          const newsData = await newsResponse.json();
          if (newsData.articles) {
            cricketData.news = newsData.articles.slice(0, 5);
          }
        }
        console.log('✅ Cricket news fetched successfully');
      } catch (newsError) {
        console.log('⚠️ News API failed:', newsError.message);
      }
    }

    // Create comprehensive data summary
    const dataSummary = {
      hasCricketData: true,
      liveMatchesCount: cricketData.liveMatches.length,
      upcomingMatchesCount: cricketData.upcomingMatches.length,
      recentResultsCount: cricketData.recentResults.length,
      newsCount: cricketData.news.length,
      message: `Live cricket data fetched: ${cricketData.liveMatches.length} live matches, ${cricketData.upcomingMatches.length} upcoming matches, ${cricketData.recentResults.length} recent results, ${cricketData.news.length} news articles`,
      data: cricketData
    };

    console.log('📊 Cricket data summary:', dataSummary.message);
    return dataSummary;

  } catch (error) {
    console.log('⚠️ Cricket data fetch failed:', error.message);
    return { 
      hasCricketData: false, 
      error: error.message,
      message: 'Cricket data detection failed - AI will use general cricket knowledge'
    };
  }
};

// Function to fetch real-time news data
const fetchNewsData = async (title, category) => {
  try {
    if (category.toLowerCase() === 'politics') {
      console.log('🏛️ Detected politics content, fetching current political news...');
      
      // Example: You can integrate with news APIs like NewsAPI, Guardian API, etc.
      // const response = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(title)}&apiKey=YOUR_API_KEY`);
      // const data = await response.json();
      
      return {
        hasNewsData: true,
        message: 'Politics data detected - AI will include current political developments and recent news'
      };
    }
    
    return { hasNewsData: false };
  } catch (error) {
    console.log('⚠️ News data fetch failed, continuing without real-time data');
    return { hasNewsData: false, error: error.message };
  }
};

// Fallback content generation function with category-specific content
const generateFallbackContent = (title, category, subtitle = '') => {
  // Category-specific fallback content
  switch (category.toLowerCase()) {
    case 'cricket':
      return `
        <h2>Introduction</h2>
        <p>Welcome to our comprehensive analysis of <strong>${title}</strong>. Cricket is one of the most popular sports globally, and understanding the dynamics of matches, players, and tournaments is crucial for any cricket enthusiast.</p>
        
        <h2>Match Overview: ${title}</h2>
        <p>${title} represents an exciting cricket encounter that showcases the skills, strategies, and competitive spirit of both teams. Cricket matches are not just about runs and wickets; they're about strategy, teamwork, and moments of brilliance.</p>
        
        <h3>Key Aspects of Cricket Matches</h3>
        <ul>
          <li><strong>Team Performance:</strong> Analyzing batting, bowling, and fielding strategies</li>
          <li><strong>Player Contributions:</strong> Individual performances that shape the match outcome</li>
          <li><strong>Match Conditions:</strong> Pitch conditions, weather, and their impact on gameplay</li>
          <li><strong>Strategic Decisions:</strong> Captaincy, team selection, and tactical moves</li>
        </ul>
        
        <h2>Why Cricket Analysis Matters</h2>
        <p>Cricket analysis helps fans understand the nuances of the game, appreciate player skills, and predict match outcomes. It provides insights into team strategies and individual performances that make cricket such an engaging sport.</p>
        
        <h3>Recent Cricket Trends</h3>
        <p>Modern cricket has evolved with new formats like T20, innovative batting techniques, and advanced bowling strategies. Understanding these trends helps in appreciating the current state of the game.</p>
        
        <h2>Match Analysis Framework</h2>
        <p>To properly analyze ${title}, we need to consider various factors including team composition, recent form, head-to-head records, and match conditions.</p>
        
        <h3>Key Metrics to Consider</h3>
        <ul>
          <li>Recent team performances and form</li>
          <li>Player statistics and current form</li>
          <li>Head-to-head records between teams</li>
          <li>Pitch and weather conditions</li>
          <li>Team strategies and game plans</li>
        </ul>
        
        <h2>Conclusion</h2>
        <p>${title} represents the essence of competitive cricket, where skill, strategy, and determination come together to create memorable moments. Whether you're a casual fan or a cricket enthusiast, understanding the dynamics of such matches enhances your appreciation of this beautiful game.</p>
        
        <p>Cricket continues to evolve, and matches like ${title} showcase the sport's ability to captivate audiences worldwide with its blend of skill, strategy, and unpredictability.</p>
      `;
      
    case 'politics':
      return `
        <h2>Introduction</h2>
        <p>Welcome to our analysis of <strong>${title}</strong>. Politics shapes our society, influences policies, and determines the direction of nations. Understanding political dynamics is crucial for informed citizenship.</p>
        
        <h2>Political Context: ${title}</h2>
        <p>${title} represents a significant aspect of political discourse that affects governance, policy-making, and public opinion. Political analysis helps us understand the forces that shape our world.</p>
        
        <h3>Key Political Factors</h3>
        <ul>
          <li><strong>Policy Impact:</strong> How political decisions affect citizens and society</li>
          <li><strong>Public Opinion:</strong> The role of public sentiment in political processes</li>
          <li><strong>Institutional Dynamics:</strong> How political institutions function and interact</li>
          <li><strong>International Relations:</strong> Global political implications and connections</li>
        </ul>
        
        <h2>Why Political Analysis Matters</h2>
        <p>Understanding politics helps citizens make informed decisions, participate effectively in democratic processes, and hold leaders accountable for their actions and policies.</p>
        
        <h2>Conclusion</h2>
        <p>${title} highlights the importance of political awareness and engagement in building a better society. Political literacy is essential for active citizenship and democratic participation.</p>
      `;
      
    case 'geography':
      return `
        <h2>Introduction</h2>
        <p>Welcome to our exploration of <strong>${title}</strong>. Geography helps us understand our world, from physical landscapes to human settlements, and their interconnected relationships.</p>
        
        <h2>Geographical Analysis: ${title}</h2>
        <p>${title} represents an important geographical phenomenon that influences climate, ecosystems, human activities, and regional development patterns.</p>
        
        <h3>Geographical Factors</h3>
        <ul>
          <li><strong>Physical Geography:</strong> Landforms, climate, and natural resources</li>
          <li><strong>Human Geography:</strong> Population, settlements, and cultural patterns</li>
          <li><strong>Environmental Impact:</strong> Human-environment interactions and sustainability</li>
          <li><strong>Regional Development:</strong> Economic and social development patterns</li>
        </ul>
        
        <h2>Why Geography Matters</h2>
        <p>Geographical understanding helps us address environmental challenges, plan sustainable development, and appreciate the diversity of our planet.</p>
        
        <h2>Conclusion</h2>
        <p>${title} demonstrates the importance of geographical knowledge in understanding our world and making informed decisions about environmental and developmental issues.</p>
      `;

    case 'education':
      return `
        <h2>Introduction</h2>
        <p>Education plays a defining role in shaping individuals, communities, and entire nations. <strong>${title}</strong>${subtitle ? ` — <em>${subtitle}</em>` : ''} explores a crucial idea within the broader education landscape and what it means for learners, teachers, and policymakers.</p>

        <h2>The Context Behind ${title}</h2>
        <p>Before diving into the details, it's important to understand why this topic matters today. Changing technology, evolving job markets, and new learning models are all transforming how we think about education.</p>

        <h3>Key Themes</h3>
        <ul>
          <li><strong>Access & Equity:</strong> Who gets quality education, and who is left behind?</li>
          <li><strong>Learning Outcomes:</strong> How do we measure what students truly learn and retain?</li>
          <li><strong>Teaching Methods:</strong> From rote learning to experiential and competency-based approaches.</li>
          <li><strong>Technology & Innovation:</strong> The role of digital tools, AI, and online platforms.</li>
        </ul>

        <h2>Deep Dive: ${title}</h2>
        <p>${title} can be understood by looking at how it affects classrooms, institutions, and long-term career paths. Whether it is a policy idea, a teaching method, or a reform model, its impact shows up in the day-to-day learning experience.</p>

        <h3>Impact on Students</h3>
        <p>Students are at the center of any educational change. ${title} influences how they engage with concepts, how motivated they feel, and what skills they ultimately carry into the real world.</p>

        <h3>Impact on Educators</h3>
        <p>For teachers and academic institutions, ${title} can mean rethinking curriculum design, assessment patterns, and classroom practices. It often demands new training, support, and clear communication.</p>

        <h2>Challenges and Opportunities</h2>
        <p>No educational idea is perfect. ${title} brings its own set of challenges — from implementation gaps to resource constraints — but it also opens the door for innovation, collaboration, and student-centered learning.</p>

        <h3>Looking Ahead</h3>
        <p>As education systems evolve, ideas like ${title} will continue to be refined. The real question is how effectively we can align them with real-world needs, local contexts, and long-term learner growth.</p>

        <h2>Conclusion</h2>
        <p>${title} is more than just an academic phrase; it represents a shift in how we think about learning, opportunity, and the future of work. By engaging with it thoughtfully, educators, parents, and students can help shape an education system that is more inclusive, relevant, and future-ready.</p>
      `;

    default:
      return `
        <h2>Introduction</h2>
        <p>Welcome to this deep-dive on <strong>${title}</strong>${subtitle ? ` — <em>${subtitle}</em>` : ''}. In today's rapidly evolving world, understanding key ideas in ${category.toLowerCase()} has become essential for both personal and professional growth.</p>

        <h2>What is ${title}?</h2>
        <p>${title} represents an important concept within the ${category.toLowerCase()} space. It brings together several moving parts — from core principles to real-world applications — that influence how people think, decide, and act.</p>

        <h3>Key Components</h3>
        <ul>
          <li><strong>Core Principles:</strong> The foundational ideas that define ${title}</li>
          <li><strong>Real-World Applications:</strong> Practical scenarios where this concept shows up</li>
          <li><strong>Benefits & Risks:</strong> What can go right, and what can go wrong, if it is misunderstood</li>
          <li><strong>Future Outlook:</strong> How ${title} might evolve over the next few years</li>
        </ul>

        <h2>Why ${title} Matters</h2>
        <p>The impact of ${title} goes beyond theory. It shapes decisions, strategies, and outcomes in the broader ${category.toLowerCase()} ecosystem — from individuals and startups to large institutions.</p>

        <h3>Practical Takeaways</h3>
        <p>If you're exploring ${title} for the first time, the most important step is to connect it with specific problems, use cases, or opportunities in your own context.</p>

        <h2>Getting Started</h2>
        <p>Begin by breaking ${title} into smaller, understandable pieces. Read a mix of foundational material and recent discussions, then experiment with small, low-risk implementations or thought exercises.</p>

        <h3>Suggested Next Steps</h3>
        <ul>
          <li>Identify one real-world example where ${title} is visible today</li>
          <li>Map its benefits and limitations in that scenario</li>
          <li>Note down 2–3 questions you still have about it</li>
          <li>Use those questions to guide further reading or experimentation</li>
        </ul>

        <h2>Conclusion</h2>
        <p>${title} is a powerful lens for understanding change within ${category.toLowerCase()}. By studying it with curiosity and clarity, you can make better decisions, spot new opportunities, and build a stronger perspective on the world around you.</p>
      `;
  }
};

// Function to generate blog content
export const generateBlogContent = async (title, category, subtitle = '') => {
  try {
    console.log('🤖 Starting Gemini AI content generation...');
    console.log('📝 Input:', { title, category, subtitle });
    
    // Check if any AI key is available (Groq preferred, then Gemini)
    if (!GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
      console.log('⚠️ No AI API key configured (GROQ_API_KEY or GEMINI_API_KEY). Using fallback content generation.');
      return generateFallbackContent(title, category, subtitle);
    }
    
    // Fetch real-time data based on category
    let realTimeData = {};
    if (category.toLowerCase() === 'cricket') {
      realTimeData = await fetchCricketData(title);
    } else if (category.toLowerCase() === 'politics') {
      realTimeData = await fetchNewsData(title, category);
    }

    // Turn real-time data into a compact, model-friendly context string
    let realTimeContext = '';

    if (realTimeData?.hasCricketData && realTimeData.data) {
      const { liveMatches = [], upcomingMatches = [], recentResults = [], news = [] } = realTimeData.data;

      const formatMatch = (m) => {
        try {
          const name = m.name || m.shortName || m.header?.matchDescription || '';
          const series = m.series?.name || m.league || '';
          const venue = m.venue?.fullName || m.venue || '';
          return [
            name && `Match: ${name}`,
            series && `Series/Tournament: ${series}`,
            venue && `Venue: ${venue}`,
          ].filter(Boolean).join(' | ');
        } catch {
          return '';
        }
      };

      const liveSummary = liveMatches
        .slice(0, 3)
        .map((m, idx) => `${idx + 1}. ${formatMatch(m)}`)
        .filter(Boolean)
        .join('\n');

      const upcomingSummary = upcomingMatches
        .slice(0, 3)
        .map((m, idx) => `${idx + 1}. ${formatMatch(m)}`)
        .filter(Boolean)
        .join('\n');

      const recentSummary = recentResults
        .slice(0, 3)
        .map((m, idx) => `${idx + 1}. ${formatMatch(m)}`)
        .filter(Boolean)
        .join('\n');

      const newsSummary = news
        .slice(0, 3)
        .map((n, idx) => `${idx + 1}. ${n.title || ''}${n.source?.name ? ` (${n.source.name})` : ''}`)
        .filter(Boolean)
        .join('\n');

      realTimeContext = `
REAL-TIME CRICKET CONTEXT (USE THIS DATA DIRECTLY IN THE BLOG):
- Live matches (top ${Math.min(liveMatches.length, 3)}):
${liveSummary || 'No live matches available'}

- Upcoming matches (top ${Math.min(upcomingMatches.length, 3)}):
${upcomingSummary || 'No upcoming matches available'}

- Recent results (top ${Math.min(recentResults.length, 3)}):
${recentSummary || 'No recent results available'}

- Recent cricket headlines (top ${Math.min(news.length, 3)}):
${newsSummary || 'No recent headlines available'}
`;
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Category-specific prompts with real-time data instructions
    const getCategorySpecificPrompt = (title, category, subtitle) => {
      const basePrompt = `Write a detailed blog post about "${title}" in the ${category} category. 
      
      Requirements:
      - Write in HTML format with proper tags
      - Include an engaging introduction
      - Add 3-4 main sections with headings (h2, h3)
      - Use paragraphs, bullet points, and formatting
      - Make it informative and engaging
      - Include practical tips or insights
      - Write 500-800 words
      - Use proper HTML structure with <p>, <h2>, <h3>, <ul>, <li> tags
      
      Start with: <h2>Introduction</h2>
      
      ${subtitle ? `Subtitle: ${subtitle}` : ''}`;

      // Category-specific enhancements
      switch (category.toLowerCase()) {
        case 'cricket':
          // Check if title contains match-related keywords
          const matchKeywords = ['vs', 'match', 'series', 'test', 'odi', 't20', 'ipl', 'world cup', 'tournament'];
          const isMatchAnalysis = matchKeywords.some(keyword => title.toLowerCase().includes(keyword));
          
          if (isMatchAnalysis) {
            return `${basePrompt}
            
            CRICKET MATCH ANALYSIS INSTRUCTIONS:
            - Analyze the specific match or series mentioned in the title
            - Include recent match results, scores, and performance statistics
            - Discuss team strategies, player performances, and key moments
            - Reference current form of players and teams involved
            - Include head-to-head records and historical context
            - Analyze pitch conditions, weather impact, and match dynamics
            - Discuss captaincy decisions, team selection, and tactical moves
            - Include recent cricket news related to the teams or players
            - Add predictions or analysis of upcoming matches if relevant
            - Reference current tournament standings or series results
            
            SPECIFIC REQUIREMENTS FOR MATCH ANALYSIS:
            - Include actual match scores and statistics where possible
            - Discuss individual player performances and contributions
            - Analyze team strengths and weaknesses
            - Reference recent form and current rankings
            - Include tactical analysis and strategic insights
            - Discuss match conditions and their impact on gameplay
            - Add context about the importance of the match or series`;
          } else {
            return `${basePrompt}
            
            CRICKET-SPECIFIC INSTRUCTIONS:
            - Include current cricket trends, recent matches, or notable players if relevant
            - Mention recent tournaments, series, or cricket events
            - Include statistics, records, or performance data where appropriate
            - Reference current cricket news or developments
            - Add match analysis or player insights if the title relates to specific matches or players
            - Include practical tips for cricket enthusiasts, players, or fans
            - Mention current cricket formats (T20, ODI, Test) and their relevance
            - Reference recent cricket achievements, records, or milestones
            
            If the title mentions specific matches, players, or tournaments, include:
            - Recent match results or scores
            - Player statistics and performance
            - Tournament standings or results
            - Analysis of recent cricket events`;
          }
          
        case 'politics':
          return `${basePrompt}
          
          POLITICS-SPECIFIC INSTRUCTIONS:
          - Include current political developments, recent elections, or policy changes
          - Reference recent political events, debates, or government decisions
          - Mention current political figures, parties, or movements if relevant
          - Include analysis of recent political trends or changes
          - Add context about current political climate or issues
          - Reference recent political news or developments
          - Include practical insights for political awareness or engagement
          - Mention current political challenges or opportunities
          
          If the title relates to specific political events or figures:
          - Include recent developments or news
          - Provide context about current political situation
          - Reference recent policy changes or decisions
          - Add analysis of political implications`;
          
        case 'geography':
          return `${basePrompt}
          
          GEOGRAPHY-SPECIFIC INSTRUCTIONS:
          - Include current geographical developments, climate changes, or environmental issues
          - Reference recent geographical discoveries, research, or studies
          - Mention current environmental challenges or conservation efforts
          - Include recent natural disasters, climate events, or geographical changes
          - Add current population trends, migration patterns, or urban development
          - Reference recent geographical research or scientific findings
          - Include practical insights about geographical awareness or travel
          - Mention current geographical challenges or opportunities
          
          If the title relates to specific locations or geographical phenomena:
          - Include recent developments or changes
          - Provide current geographical data or statistics
          - Reference recent research or studies
          - Add analysis of geographical implications`;
          
        case 'technology':
          return `${basePrompt}
          
          TECHNOLOGY-SPECIFIC INSTRUCTIONS:
          - Include current tech trends, recent innovations, or emerging technologies
          - Reference recent tech news, product launches, or industry developments
          - Mention current tech companies, startups, or industry leaders
          - Include recent technological breakthroughs or research
          - Add current tech challenges, opportunities, or future predictions
          - Reference recent tech events, conferences, or announcements
          - Include practical insights for tech adoption or implementation
          - Mention current tech industry trends or market developments`;
          
        case 'finance':
          return `${basePrompt}
          
          FINANCE-SPECIFIC INSTRUCTIONS:
          - Include current financial trends, market conditions, or economic developments
          - Reference recent financial news, market movements, or economic indicators
          - Mention current financial institutions, companies, or market leaders
          - Include recent financial regulations, policies, or changes
          - Add current investment trends, opportunities, or risks
          - Reference recent financial events, market analysis, or economic reports
          - Include practical financial advice or insights
          - Mention current financial challenges or opportunities`;
          
        case 'startup':
          return `${basePrompt}
          
          STARTUP-SPECIFIC INSTRUCTIONS:
          - Include current startup trends, recent funding rounds, or emerging startups
          - Reference recent startup news, acquisitions, or industry developments
          - Mention current successful startups, entrepreneurs, or industry leaders
          - Include recent startup challenges, opportunities, or market conditions
          - Add current startup ecosystem developments or changes
          - Reference recent startup events, pitch competitions, or accelerators
          - Include practical startup advice or insights
          - Mention current startup funding trends or investment climate`;
          
        case 'lifestyle':
          return `${basePrompt}
          
          LIFESTYLE-SPECIFIC INSTRUCTIONS:
          - Include current lifestyle trends, recent studies, or popular practices
          - Reference recent lifestyle research, health studies, or wellness developments
          - Mention current lifestyle influencers, experts, or thought leaders
          - Include recent lifestyle challenges, opportunities, or changes
          - Add current wellness trends, health practices, or lifestyle innovations
          - Reference recent lifestyle events, conferences, or community developments
          - Include practical lifestyle tips or insights
          - Mention current lifestyle challenges or opportunities`;
          
        default:
          return basePrompt;
      }
    };

    const prompt = getCategorySpecificPrompt(title, category, subtitle);

    console.log('📤 Sending prompt to Gemini AI...');
    console.log('🔍 Real-time data status:', realTimeData);
    
    // Enhanced prompt with real-time data instructions and structured layout
    const enhancedPrompt = `${prompt}
    
    IMPORTANT STRUCTURE REQUIREMENTS:
    - Use clear HTML headings and structure:
      <h2>Introduction</h2>
      <h2>Section 1: ...</h2>
      <h3>Subsection</h3>
      ...
      <h2>Conclusion</h2>
    - Keep paragraphs short (2–4 sentences) and scannable.
    - Avoid repeating the title verbatim in every heading.
    - Do NOT include any Markdown syntax, only HTML tags.
    
    IMPORTANT: You have access to real-time information via the provided context. Please:
    1. Include current, up-to-date information relevant to the topic
    2. Reference recent events, developments, or news if applicable
    3. Use your knowledge cutoff to provide the most recent information available
    4. If discussing specific matches, players, or events, include recent data and statistics
    5. Make the content feel current and relevant to today's context
    
    ${realTimeContext || ''}
    ${realTimeData.hasNewsData ? 'REAL-TIME POLITICS DATA DETECTED: Include current political developments, recent elections, policy changes, and up-to-date political news, explicitly referencing them in the analysis.' : ''}
    
    For cricket blogs specifically:
    - Include recent match results, player performances, or tournament standings
    - Reference current cricket news, transfers, or developments
    - Mention recent records, achievements, or milestones
    - Include current player rankings or statistics if relevant
    - Add specific match scores, player stats, and tournament standings where applicable
    - If live matches are available, include current scores and match status
    - If upcoming matches exist, mention the schedule and key players to watch
    - Reference recent news articles for context and current developments
    
    For politics blogs:
    - Reference recent political developments, elections, or policy changes
    - Include current political climate and recent events
    - Mention recent political figures, parties, or movements
    - Add specific political events, election results, or policy announcements
    
    For geography blogs:
    - Include recent geographical developments, climate changes, or environmental issues
    - Reference current population trends, migration patterns, or urban development
    - Mention recent natural disasters, climate events, or geographical changes
    - Add specific geographical data, climate statistics, or environmental reports
    
    Make the content feel fresh, current, and relevant to the present time. Include specific data, statistics, and recent developments to make it engaging and informative.`;

    console.log('📝 Enhanced prompt length:', enhancedPrompt.length, 'characters');
    console.log('🎯 Category:', category);
    console.log('📰 Title:', title);

    let content = '';
    let usage = {};

    if (GROQ_API_KEY) {
      console.log('⚙️ Using Groq API (llama-3.1-70b-versatile) for blog generation...');
      const groqResult = await generateWithGroq(enhancedPrompt);
      content = groqResult.content;
      usage = groqResult.usage;
    } else {
      console.log('⚙️ Using Google Gemini (gemini-1.5-flash) for blog generation...');

      // Use explicit generation config to control length and cost
      const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent({
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
        generationConfig: {
          maxOutputTokens: 1100,   // ~700–800 words, keeps cost under control
          temperature: 0.8,
          topP: 0.9,
          topK: 40,
        },
      });

      const response = await result.response;
      content = response.text();
      usage = response.usageMetadata || {};
    }

    console.log('✅ AI content generated successfully');
    if (usage) {
      console.log('📊 Tokens usage:', usage);
    }
    console.log('📊 Content length:', content.length, 'characters');
    console.log('📄 Content preview:', content.substring(0, 200) + '...');

    // Safety: if model ignored HTML instructions and returned plain text, wrap in basic HTML
    if (!content.includes('<h2') && !content.includes('<p>')) {
      const escaped = content
        .split('\n\n')
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => `<p>${p}</p>`)
        .join('\n');
      return `<h2>Introduction</h2>\n${escaped}`;
    }

    return content;
  } catch (error) {
    console.error('❌ Gemini AI error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    console.log('🔄 Falling back to category-specific template content generation');
    
    // Return category-specific fallback content if AI fails
    return generateFallbackContent(title, category, subtitle);
  }
};

export default generateBlogContent;