import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function GET() {
	return json({
		vercelEnv: env.VERCEL_ENV || process.env.VERCEL_ENV || null,
		vercelUrl: env.VERCEL_URL || process.env.VERCEL_URL || null,
		hasResendApiKey: Boolean(env.RESEND_API_KEY || process.env.RESEND_API_KEY),
		hasEmailFrom: Boolean(env.EMAIL_FROM || process.env.EMAIL_FROM),
		hasEmailReplyTo: Boolean(env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO),
		hasSupabaseUrl: Boolean(env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL),
		hasSupabaseAnonKey: Boolean(env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY)
	});
}
