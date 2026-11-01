for(const name of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','OPENAI_MODEL','REASONING_EFFORT','MAX_TURNS','MAX_OUTPUT_TOKENS','OPENAI_API_KEY','SESSION_SECRET','STUDY_ACCESS_CODE'])if(!process.env[name])throw Error(`Missing ${name}`);
if(process.env.SESSION_SECRET.length<32)throw Error('SESSION_SECRET must be at least 32 characters');
console.log('Required settings are present.');
