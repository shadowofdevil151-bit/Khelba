import { Anek_Bangla, Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AuthProvider } from "@/contexts/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700", "800"] });
const bangla = Anek_Bangla({ subsets: ["latin", "bengali"], variable: "--font-bengali-numbers", weight: ["400", "500", "600", "700"] });
export const metadata = { title: "Khelba", description: "শিখুন, প্রতিযোগিতা করুন, একসঙ্গে এগিয়ে যান।" };

export default function RootLayout({ children }) {
    return <html lang="bn"><body className={`${inter.variable} ${bangla.variable}`}><AuthProvider>{children}</AuthProvider></body></html>;
}
