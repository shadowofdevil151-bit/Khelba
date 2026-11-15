# 📚 HSC উচ্চতর গণিত ২য় পত্র - অধ্যায় ৭: বিপরীত ত্রিকোণমিতিক ফাংশন ও ত্রিকোণমিতিক সমীকরণ (Inverse Trigonometric Functions & Trigonometric Equations)

> **অধ্যায়ের সারাংশ:** ত্রিকোণমিতিক ফাংশনসমূহ এক-এক ফাংশন (One-to-one function) না হওয়ায় তাদের বিপরীত ফাংশন সংজ্ঞায়িত করতে নির্দিষ্ট ডোমেইন ও রেঞ্জের প্রয়োজন হয়। এই অধ্যায়ে বিপরীত ত্রিকোণমিতিক ফাংশনের মুখ্যমান, ধর্মাবলি, বিভিন্ন রূপান্তর এবং ত্রিকোণমিতিক সমীকরণের সাধারণ সমাধান নির্ণয়ের কৌশলগুলো গোছানোভাবে দেওয়া হলো।

---

## 🎯 ১. মৌলিক ধারণা (Basic Concepts)

*   **বিপরীত ত্রিকোণমিতিক ফাংশন (Inverse Trigonometric Function):** ত্রিকোণমিতিক ফাংশনের ডোমেইনকে সীমিত (Restricted) করে এক-এক ফাংশন বানিয়ে যে বিপরীত ফাংশন পাওয়া যায়, তাকে বিপরীত ত্রিকোণমিতিক ফাংশন বলে। এদেরকে $\sin^{-1}x, \cos^{-1}x, \tan^{-1}x$ ইত্যাদি দ্বারা প্রকাশ করা হয়।
*   **মুখ্যমান (Principal Value):** বিপরীত ত্রিকোণমিতিক ফাংশনের অসংখ্য মানের মধ্যে যে মানটি সাংখ্যিকভাবে ক্ষুদ্রতম (ধনাত্মক বা ঋণাত্মক) এবং যে মানটি ফাংশনের নির্দিষ্ট রেঞ্জের অন্তর্ভুক্ত, তাকে মুখ্যমান বা প্রধান মান বলে।

### 🔹 ডোমেইন ও রেঞ্জ (Domain & Range)
| ফাংশন (Function) | ডোমেইন (Domain) | রেঞ্জ / মুখ্যমানের সীমা (Range) |
| :--- | :--- | :--- |
| **$\sin^{-1}x$** | $[-1, 1]$ | $\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]$ |
| **$\cos^{-1}x$** | $[-1, 1]$ | $[0, \pi]$ |
| **$\tan^{-1}x$** | $(-\infty, \infty)$ | $\left(-\frac{\pi}{2}, \frac{\pi}{2}\right)$ |
| **$\sec^{-1}x$** | $(-\infty, -1] \cup [1, \infty)$ | $\left[0, \frac{\pi}{2}\right) \cup \left(\frac{\pi}{2}, \pi\right]$ |
| **$\text{cosec}^{-1}x$** | $(-\infty, -1] \cup [1, \infty)$ | $\left[-\frac{\pi}{2}, 0\right) \cup \left(0, \frac{\pi}{2}\right]$ |
| **$\cot^{-1}x$** | $(-\infty, \infty)$ | $(0, \pi)$ |

<!-- MAT-2nd-C07-I01 -->

![Graphs of \sin^{-1}x, \cos^{-1}x, and \tan^{-1}x showing their domains and ranges.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793719610/image_97d8abce_1_fxs3cx.jpg)

---

## 🧮 ২. বিপরীত ত্রিকোণমিতিক ফাংশনের ধর্মাবলি (Properties)

### 🔹 পূরক কোণ সম্পর্ক (Complementary Angle Relations)
*   $\sin^{-1}x + \cos^{-1}x = \frac{\pi}{2}, \quad x \in [-1, 1]$
*   $\tan^{-1}x + \cot^{-1}x = \frac{\pi}{2}, \quad x \in \mathbb{R}$
*   $\sec^{-1}x + \text{cosec}^{-1}x = \frac{\pi}{2}, \quad x \in (-\infty, -1] \cup [1, \infty)$

### 🔹 ঋণাত্মক চলক সম্পর্ক (Negative Argument Relations)
*   $\sin^{-1}(-x) = -\sin^{-1}x$
*   $\cos^{-1}(-x) = \pi - \cos^{-1}x$
*   $\tan^{-1}(-x) = -\tan^{-1}x$
*   $\cot^{-1}(-x) = \pi - \cot^{-1}x$
*   $\sec^{-1}(-x) = \pi - \sec^{-1}x$
*   $\text{cosec}^{-1}(-x) = -\text{cosec}^{-1}x$

### 🔹 পারস্পরিক রূপান্তর (Inter-conversion of Inverse Functions)
একটি বিপরীত ত্রিকোণমিতিক ফাংশনকে অপর একটি ফাংশনের মাধ্যমে প্রকাশ করা যায়। (একটি সমকোণী ত্রিভুজের সাহায্যে সহজেই বের করা যায়)
*   **$\sin^{-1}x$ এর রূপান্তর:**

$$
\sin^{-1}x = \cos^{-1}\sqrt{1-x^2} = \tan^{-1}\left(\frac{x}{\sqrt{1-x^2}}\right) = \cot^{-1}\left(\frac{\sqrt{1-x^2}}{x}\right) = \sec^{-1}\left(\frac{1}{\sqrt{1-x^2}}\right) = \text{cosec}^{-1}\left(\frac{1}{x}\right)
$$

*   **$\cos^{-1}x$ এর রূপান্তর:**

$$
\cos^{-1}x = \sin^{-1}\sqrt{1-x^2} = \tan^{-1}\left(\frac{\sqrt{1-x^2}}{x}\right) = \cot^{-1}\left(\frac{x}{\sqrt{1-x^2}}\right)
$$

*   **$\tan^{-1}x$ এর রূপান্তর:**

$$
\tan^{-1}x = \sin^{-1}\left(\frac{x}{\sqrt{1+x^2}}\right) = \cos^{-1}\left(\frac{1}{\sqrt{1+x^2}}\right)
$$


### 🔹 যোগ ও বিয়োগ সূত্র (Addition & Subtraction Formulas)
*   $\tan^{-1}x + \tan^{-1}y = \tan^{-1}\left(\frac{x+y}{1-xy}\right) \quad \text{(যেখানে } xy < 1 \text{)}$
*   $\tan^{-1}x - \tan^{-1}y = \tan^{-1}\left(\frac{x-y}{1+xy}\right) \quad \text{(যেখানে } xy > -1 \text{)}$
*   $\tan^{-1}x + \tan^{-1}y + \tan^{-1}z = \tan^{-1}\left(\frac{x+y+z-xyz}{1-xy-yz-zx}\right)$

### 🔹 গুণিতক কোণ সূত্র (Multiple Angle Formulas)
*   $2\sin^{-1}x = \sin^{-1}(2x\sqrt{1-x^2})$
*   $2\cos^{-1}x = \cos^{-1}(2x^2-1)$
*   $2\tan^{-1}x = \tan^{-1}\left(\frac{2x}{1-x^2}\right) = \sin^{-1}\left(\frac{2x}{1+x^2}\right) = \cos^{-1}\left(\frac{1-x^2}{1+x^2}\right)$
*   $3\sin^{-1}x = \sin^{-1}(3x - 4x^3)$
*   $3\cos^{-1}x = \cos^{-1}(4x^3 - 3x)$
*   $3\tan^{-1}x = \tan^{-1}\left(\frac{3x-x^3}{1-3x^2}\right)$

> 💡 **Exam Tip:** $\sin^{-1}x, \cos^{-1}x$ ইত্যাদি লেখার সময় মনে রাখতে হবে এটি একটি কোণ নির্দেশ করে, কোনো সংখ্যা নয়। যেমন, $\sin^{-1}(\frac{1}{2}) = \frac{\pi}{6}$ (একটি কোণ), কিন্তু $\frac{1}{\sin(\frac{1}{2})}$ ভিন্ন কিছু।

---

## ⚖️ ৩. ত্রিকোণমিতিক সমীকরণ (Trigonometric Equations)

ত্রিকোণমিতিক সমীকরণের সাধারণ সমাধান (General Solution) বলতে অসংখ্য সমাধানকে বোঝায়, যা সাধারণত একটি পূর্ণসংখ্যা $n$ (যেখানে $n \in \mathbb{Z}$) এর মাধ্যমে প্রকাশ করা হয়।

### 🔹 মৌলিক সমীকরণের সাধারণ সমাধান (General Solutions of Basic Equations)
| সমীকরণ (Equation) | সাধারণ সমাধান (General Solution) |
| :--- | :--- |
| **$\sin\theta = 0$** | $\theta = n\pi$ |
| **$\cos\theta = 0$** | $\theta = (2n+1)\frac{\pi}{2}$ |
| **$\tan\theta = 0$** | $\theta = n\pi$ |
| **$\cot\theta = 0$** | $\theta = (2n+1)\frac{\pi}{2}$ |
| **$\sin\theta = 1$** | $\theta = (4n+1)\frac{\pi}{2}$ |
| **$\sin\theta = -1$** | $\theta = (4n-1)\frac{\pi}{2}$ |
| **$\cos\theta = 1$** | $\theta = 2n\pi$ |
| **$\cos\theta = -1$** | $\theta = (2n+1)\pi$ |

### 🔹 সাধারণ মানযুক্ত সমীকরণের সমাধান
*   **$\sin\theta = \sin\alpha$** হলে, $\theta = n\pi + (-1)^n \alpha$
*   **$\cos\theta = \cos\alpha$** হলে, $\theta = 2n\pi \pm \alpha$
*   **$\tan\theta = \tan\alpha$** হলে, $\theta = n\pi + \alpha$

### 🔹 $a\sin\theta + b\cos\theta = c$ আকারের সমীকরণ
সমাধানের ধাপসমূহ:
1.  সমীকরণের উভয় পক্ষকে $\sqrt{a^2 + b^2}$ দ্বারা ভাগ করতে হবে।
2.  এরপর $\sin$ বা $\cos$ এর যৌগিক কোণ সূত্র প্রয়োগ করে সমাধান করতে হবে।

$$
\frac{a}{\sqrt{a^2+b^2}}\sin\theta + \frac{b}{\sqrt{a^2+b^2}}\cos\theta = \frac{c}{\sqrt{a^2+b^2}}
$$

    ধরি, $\cos\alpha = \frac{a}{\sqrt{a^2+b^2}}$ এবং $\sin\alpha = \frac{b}{\sqrt{a^2+b^2}}$।
    তাহলে, $\sin\theta\cos\alpha + \cos\theta\sin\alpha = \sin(\theta+\alpha) = \frac{c}{\sqrt{a^2+b^2}}$।

### 🔹 দ্বিঘাত আকারের সমীকরণ (Quadratic Form)
কখনো কখনো $\sin^2\theta, \cos^2\theta, \tan^2\theta$ যুক্ত সমীকরণকে দ্বিঘাত সমীকরণের মতো করে সমাধান করতে হয়। যেমন: $2\sin^2\theta - 3\sin\theta + 1 = 0$। এখানে $\sin\theta = x$ ধরে সমাধান করলে $x$ এর মান পাওয়া যায়, যা থেকে পরে $\theta$ এর মান বের করতে হয়।

> 🧠 **Memory Hack:** 
> *   $\sin\theta$ এর ক্ষেত্রে $(-1)^n$ মনে রাখা সহজ, কারণ $\sin$ এর মান চার্টে $+,-,+,-$ হয়, যা $(-1)^n$ দ্বারা নিয়ন্ত্রিত হয়।
> *   $\cos\theta$ এর ক্ষেত্রে $2n\pi \pm \alpha$ মনে রাখা সহজ, কারণ $\cos$ এর মান চার্টে $+,-,-,+$ হয়, যা কোণের $+ \alpha$ এবং $- \alpha$ এর সাথে সম্পর্কিত।

### 🔹 অপ্রাসঙ্গিক মূল (Extraneous Roots)
সমীকরণ সমাধান করার সময় যদি উভয় পক্ষকে বর্গ (Square) করা হয়, তবে কিছু অতিরিক্ত মূল (Extra root) চলে আসতে পারে, যারা মূল সমীকরণকে সিদ্ধ করে না। এদেরকে অপ্রাসঙ্গিক মূল (Extraneous Root) বলে। এদেরকে অবশ্যই বাদ দিতে হবে।

> 💡 **Exam Tip:** ত্রিকোণমিতিক সমীকরণ সমাধানের সময় উভয় পক্ষকে বর্গ করা থেকে যতটা সম্ভব বিরত থাকুন। যদি করতে হয়, তবে প্রাপ্ত সমাধানগুলোকে মূল সমীকরণে বসিয়ে যাচাই করে নিন।

---

## 🎁 ৪. ফর্মুলা ব্যাংক (Quick Revision Table)

| কনসেপ্ট | সূত্র / মান |
| :--- | :--- |
| **পূরক কোণ** | $\sin^{-1}x + \cos^{-1}x = \frac{\pi}{2}$ |
| **পূরক কোণ** | $\tan^{-1}x + \cot^{-1}x = \frac{\pi}{2}$ |
| **ঋণাত্মক কোণ** | $\sin^{-1}(-x) = -\sin^{-1}x$ |
| **ঋণাত্মক কোণ** | $\cos^{-1}(-x) = \pi - \cos^{-1}x$ |
| **যোগফল** | $\tan^{-1}x + \tan^{-1}y = \tan^{-1}\left(\frac{x+y}{1-xy}\right)$ |
| **বিয়োগফল** | $\tan^{-1}x - \tan^{-1}y = \tan^{-1}\left(\frac{x-y}{1+xy}\right)$ |
| **দ্বিগুণ কোণ** | $2\tan^{-1}x = \tan^{-1}\left(\frac{2x}{1-x^2}\right)$ |
| **ত্রিগুণ কোণ** | $3\sin^{-1}x = \sin^{-1}(3x - 4x^3)$ |
| **সাধারণ সমাধান ($\sin$)** | $\theta = n\pi + (-1)^n \alpha$ |
| **সাধারণ সমাধান ($\cos$)** | $\theta = 2n\pi \pm \alpha$ |
| **সাধারণ সমাধান ($\tan$)** | $\theta = n\pi + \alpha$ |

> 🧠 **Memory Hack:** 
> *   মনে রাখবেন, $\sin^{-1}x$ এর ডোমেইন $[-1, 1]$ এবং রেঞ্জ $[-\pi/2, \pi/2]$। $\cos^{-1}x$ এর রেঞ্জ $[0, \pi]$। 
> *   $\tan^{-1}x + \tan^{-1}y = \tan^{-1}\left(\frac{x+y}{1-xy}\right)$ সূত্রটি মনে রাখতে, $\tan(A+B)$ সূত্রের কথা ভাবুন।
> *   সমীকরণে $a\sin\theta + b\cos\theta$ থাকলে সর্বদা $\sqrt{a^2+b^2}$ দিয়ে ভাগ করতে ভুলবেন না।