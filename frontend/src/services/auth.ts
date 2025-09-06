// src/services/auth.ts (Anda bisa menempatkannya di folder 'services' atau 'api')

import axios from 'axios'; // Pastikan Anda sudah menginstal axios: npm install axios atau yarn add axios

// --- Interface untuk data yang digunakan ---

// Interface untuk kredensial login yang dikirim ke backend
interface LoginCredentials {
  username?: string; // Opsional, tergantung apakah login menggunakan username atau email
  email?: string;    // Opsional, tergantung apakah login menggunakan username atau email
  password: string;
}

// Interface untuk data respons sukses dari backend setelah login
interface LoginResponseData {
  token: string;
  admin_id: number;
  username: string;
  email: string;
  // Anda bisa tambahkan properti lain yang diterima dari backend, misal:
  // photoURL?: string;
  // role?: string;
}

// --- Fungsi-fungsi Autentikasi ---

/**
 * Melakukan permintaan login ke backend.
 * Setelah sukses, menyimpan token dan data pengguna ke localStorage.
 * @param credentials Objek berisi username/email dan password.
 * @returns Promise yang resolve dengan LoginResponseData jika sukses.
 * @throws Error jika login gagal (respon server error atau kesalahan jaringan).
 */
export async function loginUser(credentials: LoginCredentials): Promise<LoginResponseData> {
  try {
    // Sesuaikan URL endpoint API login Anda
    const response = await axios.post<LoginResponseData>('http://localhost:5000/api/admin/login', credentials);

    const { token, admin_id, username, email } = response.data;

    // Simpan token akses dan data pengguna di localStorage
    localStorage.setItem('accessToken', token);
    localStorage.setItem('currentUser', JSON.stringify({ admin_id, username, email }));

    console.log('Login successful!', username, email);
    return response.data; // Kembalikan data untuk komponen yang memanggil
  } catch (error) {
    console.error('Login failed:', error);
    // Penanganan error yang lebih spesifik
    if (axios.isAxiosError(error) && error.response) {
      // Ini adalah error dari respons server (misal: 401 Unauthorized, 400 Bad Request)
      throw new Error(error.response.data.error || 'Login gagal. Silakan coba lagi.');
    }
    // Ini adalah error lain (misal: kesalahan jaringan, server tidak merespons)
    throw new Error('Terjadi kesalahan tak terduga saat login.');
  }
}

/**
 * Menghapus data sesi pengguna dari localStorage, efektif melogout pengguna.
 */
export function logoutUser(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  console.log('Pengguna berhasil logout.');
  // Anda bisa menambahkan logika lain di sini, misal menghapus cookie
}

/**
 * Mengambil data pengguna yang sedang login dari localStorage.
 * @returns LoginResponseData atau null jika tidak ada data pengguna tersimpan.
 */
export function getCurrentUserFromLocalStorage(): LoginResponseData | null {
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      return JSON.parse(storedUser) as LoginResponseData;
    }
  } catch (error) {
    console.error("Gagal mem-parsing data pengguna dari localStorage:", error);
    // Jika data di localStorage rusak, hapus agar tidak menyebabkan masalah di kemudian hari
    localStorage.removeItem('currentUser');
  }
  return null;
}

/**
 * Mengambil token akses dari localStorage.
 * @returns String token atau null jika tidak ada token tersimpan.
 */
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}