# 📚 HSC উচ্চতর গণিত ১ম পত্র - অধ্যায় ৬: ত্রিকোণমিতিক অনুপাত (Trigonometric Ratios)

> **অধ্যায়ের সারাংশ:** এই অধ্যায়টি ত্রিকোণমিতির ভিত্তি। কোণ পরিমাপ থেকে শুরু করে ত্রিকোণমিতিক অনুপাত, চিহ্ন, মৌলিক অভেদ এবং লেখচিত্রের সবকিছু এখানে একদম পরিষ্কারভাবে গোছানো হয়েছে। 

---

## 📐 ১. কোণ ও পরিমাপ (Angles & Measurement)

**ত্রিকোণমিতি (Trigonometry):** গণিতের যে শাখায় ত্রিভুজের বাহু ও কোণের পারস্পরিক সম্পর্ক নিয়ে আলোচনা করা হয়।

### 🔹 জ্যামিতিক বনাম ত্রিকোণমিতিক কোণ
*   **জ্যামিতিক কোণ (Geometrical Angle):** সাধারণত $0^\circ$ থেকে $360^\circ$ এর মধ্যে সীমাবদ্ধ থাকে এবং ঋণাত্মক হতে পারে না।
*   **ত্রিকোণমিতিক কোণ (Trigonometric Angle):** একটি ঘূর্ণায়মান রশ্মি (Rotating Ray) তার আদি অবস্থান থেকে ঘুরে যে কোণ উৎপন্ন করে। এটি ধনাত্মক (+) বা ঋণাত্মক (-) হতে পারে।
    *   **ঘড়ির কাঁটার বিপরীত দিকে (Anti-clockwise):** ধনাত্মক কোণ (Positive Angle)।
    *   **ঘড়ির কাঁটার দিকে (Clockwise):** ঋণাত্মক কোণ (Negative Angle)।

<!-- MAT-1st-C06-I01 -->

![A diagram showing initial and terminal sides of an angle, illustrating positive (anti-clockwise) and negative (clockwise) rotations.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793717967/image_670518b0_1_p3juwq.jpg)

### 🔹 কোণ পরিমাপের পদ্ধতি (Systems of Measurement)
1.  **ষাটমূলক পদ্ধতি (Sexagesimal System):**
    *   $1$ সমকোণ $= 90^\circ$ (ডিগ্রি / Degree)
    *   $1^\circ = 60'$ (মিনিট / Minute)
    *   $1' = 60''$ (সেকেন্ড / Second)
2.  **বৃত্তীয় পদ্ধতি (Circular System):**
    *   একক: **রেডিয়ান (Radian)**।
    *   সংজ্ঞা: বৃত্তের ব্যাসার্ধের সমান দৈর্ঘ্যের চাপ কেন্দ্রে যে কোণ উৎপন্ন করে, তাকে $1$ রেডিয়ান বলে।

### 🔹 ডিগ্রি ও রেডিয়ানের সম্পর্ক (Relation between Degree and Radian)

$$
\pi^c = 180^\circ
$$

*   $1^c = \frac{180^\circ}{\pi}$ (রেডিয়ান থেকে ডিগ্রিতে)
*   $1^\circ = \frac{\pi^c}{180}$ (ডিগ্রি থেকে রেডিয়ানে)
> 💡 **Exam Tip:** $\pi \approx 3.1416$ এবং $\pi \approx \frac{22}{7}$ (আনুমানিক হিসাবের জন্য)।

### 🔹 চাপ ও বৃত্তকলার ক্ষেত্রফল (Arc Length & Sector Area)
যদি ব্যাসার্ধ $r$ এবং কেন্দ্রস্থ কোণ $\theta$ (রেডিয়ানে) হয়:
*   **চাপের দৈর্ঘ্য (Arc Length):** $S = r\theta$
*   **বৃত্তকলার ক্ষেত্রফল (Area of Sector):** $A = \frac{1}{2}r^2\theta$

---

## 🎯 ২. ত্রিকোণমিতিক অনুপাত (Trigonometric Ratios)

স্থানাঙ্ক জ্যামিতির সাহায্যে: একটি ঘূর্ণায়মান রশ্মি $OP = r$ এবং $P$ বিন্দুর স্থানাঙ্ক $(x, y)$ হলে:
*   $\sin\theta = \frac{y}{r}$ (কোটি / Ordinate ÷ ব্যাসার্ধ)
*   $\cos\theta = \frac{x}{r}$ (ভুজ / Abscissa ÷ ব্যাসার্ধ)
*   $\tan\theta = \frac{y}{x}$ (কোটি ÷ ভুজ)
*   $\csc\theta = \frac{r}{y}$, $\sec\theta = \frac{r}{x}$, $\cot\theta = \frac{x}{y}$

### 🔄 চতুর্ভাগ অনুযায়ী চিহ্ন (Signs in Quadrants) - ASTC Rule
| চতুর্ভাগ (Quadrant) | কোণের ব্যাপ্তি | ধনাত্মক অনুপাত (Positive Ratios) | শর্টকাট (Mnemonic) |
| :--- | :--- | :--- | :--- |
| **প্রথম (I)** | $0^\circ - 90^\circ$ | **সবকটি (All)** | **A**ll |
| **দ্বিতীয় (II)** | $90^\circ - 180^\circ$ | $\sin$ ও $\csc$ | **S**ilver |
| **তৃতীয় (III)** | $180^\circ - 270^\circ$ | $\tan$ ও $\cot$ | **T**ea |
| **চতুর্থ (IV)** | $270^\circ - 360^\circ$ | $\cos$ ও $\sec$ | **C**ups |

> 🧠 **Memory Hack:** **A**ll **S**ilver **T**ea **C**ups ➡️ A (All), S (Sin/Cosec), T (Tan/Cot), C (Cos/Sec). 

---

## 🧬 ৩. মৌলিক অভেদ (Fundamental Identities)

এই তিনটি অভেদ পুরো ত্রিকোণমিতির ভিত্তি। এগুলো মুখস্থ থাকলে যেকোনো অঙ্ক সহজেই সাজানো যায়।

1.  $\sin^2\theta + \cos^2\theta = 1$
    *   রূপান্তর: $\sin^2\theta = 1 - \cos^2\theta$, $\cos^2\theta = 1 - \sin^2\theta$
2.  $\sec^2\theta - \tan^2\theta = 1$
    *   রূপান্তর: $\sec^2\theta = 1 + \tan^2\theta$, $\tan^2\theta = \sec^2\theta - 1$
3.  $\csc^2\theta - \cot^2\theta = 1$
    *   রূপান্তর: $\csc^2\theta = 1 + \cot^2\theta$, $\cot^2\theta = \csc^2\theta - 1$

---

## 📈 ৪. ত্রিকোণমিতিক ফাংশনের লেখচিত্র (Graphs of Trigonometric Functions)

HSC পরীক্ষায় গ্রাফ আঁকা এবং এর বৈশিষ্ট্য (ডোমেইন, রেঞ্জ, পর্যায়কাল) জানতে চাওয়া হয়।

### 🔹 $y = \sin x$ এর লেখচিত্র
*   **ডোমেইন (Domain):** $\mathbb{R}$ (সব বাস্তব সংখ্যা)
*   **রেঞ্জ (Range):** $[-1, 1]$
*   **পর্যায়কাল (Period):** $2\pi$ বা $360^\circ$
*   **বৈশিষ্ট্য:** মূলবিন্দুগামী (Origin), স্পন্দনশীল (Oscillatory)। 

### 🔹 $y = \cos x$ এর লেখচিত্র
*   **ডোমেইন (Domain):** $\mathbb{R}$
*   **রেঞ্জ (Range):** $[-1, 1]$
*   **পর্যায়কাল (Period):** $2\pi$ বা $360^\circ$
*   **বৈশিষ্ট্য:** মূলবিন্দুগামী নয় (y-অক্ষকে $(0,1)$ বিন্দুতে ছেদ করে)।

### 🔹 $y = \tan x$ এর লেখচিত্র
*   **ডোমেইন (Domain):** $\mathbb{R} - \{(2n+1)\frac{\pi}{2}\}$ (যেখানে $n$ পূর্ণসংখ্যা)
*   **রেঞ্জ (Range):** $\mathbb{R}$ (সব বাস্তব সংখ্যা)
*   **পর্যায়কাল (Period):** $\pi$ বা $180^\circ$
*   **বৈশিষ্ট্য:** বিচ্ছিন্ন (Discontinuous)। $x = \pm\frac{\pi}{2}, \pm\frac{3\pi}{2}$ বিন্দুতে অসীমের দিকে যায় (Asymptotes)।

<!-- MAT-1st-C06-I02 -->

![Three separate graphs side-by-side for y = sin x (0 to 2π), y = cos x (0 to 2π), and y = tan x (-π/2 to π/2). Mark the intercepts, maximum/minimum points, and asymptotes for tan.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718009/image_2bb6f14b_1_a9hhdf.jpg)

---

## 🎁 ৫. ফর্মুলা ব্যাংক (Quick Revision Table)

| কনসেপ্ট | সূত্র / মান |
| :--- | :--- |
| রেডিয়ান থেকে ডিগ্রি | $1^c = \frac{180^\circ}{\pi}$ |
| ডিগ্রি থেকে রেডিয়ান | $1^\circ = \frac{\pi^c}{180}$ |
| চাপের দৈর্ঘ্য | $S = r\theta$ |
| বৃত্তকলার ক্ষেত্রফল | $A = \frac{1}{2}r^2\theta$ |
| পিথাগোরীয় অভেদ ১ | $\sin^2\theta + \cos^2\theta = 1$ |
| পিথাগোরীয় অভেদ ২ | $1 + \tan^2\theta = \sec^2\theta$ |
| পিথাগোরীয় অভেদ ৩ | $1 + \cot^2\theta = \csc^2\theta$ |
| $\sin$ এর রেঞ্জ | $[-1, 1]$ |
| $\cos$ এর রেঞ্জ | $[-1, 1]$ |
| $\tan$ এর ডোমেইন | $\mathbb{R} - \{(2n+1)\frac{\pi}{2}\}$ |

> 💡 **Exam Tip:** ত্রিকোণমিতিক অভেদ প্রমাণ করার সময় সবসময় **জটিল পক্ষ (L.H.S)** থেকে শুরু করে **সরল পক্ষ (R.H.S)** এ যাওয়া উচিত। $\sin$ এবং $\cos$ এ রূপান্তর করলে বেশিরভাগ অঙ্ক সহজে সমাধান হয়।