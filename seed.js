import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Fungsi untuk membaca file .env secara manual agar tidak perlu install library dotenv tambahan
function loadEnv() {
	const envPath = path.resolve('.env');
	if (fs.existsSync(envPath)) {
		const envFile = fs.readFileSync(envPath, 'utf8');
		envFile.split('\n').forEach(line => {
			const match = line.match(/^([^=:#]+?)[=:](.*)/);
			if (match) {
				const key = match[1].trim();
				const value = match[2].trim();
				process.env[key] = value;
			}
		});
	}
}

loadEnv();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const secreteKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !secreteKey) {
	console.error('❌ Error: PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, secreteKey);

async function seedAdmin() {
	console.log('🔄 Memulai proses seed user admin...');

	const username = 'admin';
	const password = 'password123'; // Password default sederhana

	// Cek apakah admin sudah ada
	const { data: existingUser, error: checkError } = await supabase
		.from('user')
		.select('*')
		.eq('username', username)
		.single();

	if (existingUser) {
		console.log('⚠️ User admin sudah ada di database.');
		return;
	}

	// Insert admin baru
	const { error } = await supabase
		.from('user')
		.insert([
			{
				username: username,
				password: password, // Menyimpan password secara sederhana sesuai instruksi sebelumnya
				role: 'admin',
				created_at: new Date().toISOString()
			}
		]);

	if (error) {
		console.error('❌ Gagal membuat user admin:', error.message);
	} else {
		console.log(`✅ Berhasil! User admin telah dibuat.\nUsername: ${username}\nPassword: ${password}`);
	}
}

seedAdmin();
