export interface Env {
 DB:D1Database;
 PERSONAS:R2Bucket;
 OPENAI_API_KEY?:string;
 SESSION_SECRET?:string;
 STUDY_ACCESS_CODE?:string;
 ADMIN_ACCESS_CODE?:string;
 ALLOWED_ORIGIN:string;
 OPENAI_MODEL?:string;
 REASONING_EFFORT?:string;
 MAX_TURNS?:string;
 MAX_OUTPUT_TOKENS?:string;
 AUTH_LIMITER?:{limit(options:{key:string}):Promise<{success:boolean}>};
}
