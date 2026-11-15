# 📚 HSC উচ্চতর গণিত ১ম পত্র - অধ্যায় ১০: যোগজীকরণ (Integration)

> **অধ্যায়ের সারাংশ:** এই অধ্যায়টি অন্তরীকরণের (Differentiation) ঠিক উল্টো প্রক্রিয়া। এখানে অনির্দিষ্ট ও নির্দিষ্ট যোগজ, বিভিন্ন পদ্ধতিতে যোগজ নির্ণয় এবং ক্ষেত্রফল নির্ণয়ের সব সূত্র ও টেকনিক একদম গোছানোভাবে দেওয়া হলো।

---

## 🧮 ১. যোগজীকরণের মৌলিক সূত্র (Basic Integration Formulas)

যোগজীকরণ হলো অন্তরজের বিপরীত প্রক্রিয়া। যদি $\frac{d}{dx}\{F(x)\} = f(x)$ হয়, তবে $\int f(x) dx = F(x) + c$ (যেখানে $c$ হলো যোগজ ধ্রুবক)।

### 🔹 স্ট্যান্ডার্ড সূত্রাবলি (Standard Formulas)
| ফাংশন $f(x)$ | যোগজ $\int f(x) dx$ | শর্ত |
| :--- | :--- | :--- |
| $x^n$ | $\frac{x^{n+1}}{n+1} + c$ | $n \neq -1$ |
| $\frac{1}{x}$ | $\ln\lvert x\rvert + c$ | $x \neq 0$ |
| $e^{mx}$ | $\frac{1}{m}e^{mx} + c$ | $m \neq 0$ |
| $a^x$ | $\frac{a^x}{\ln a} + c$ | $a > 0, a \neq 1$ |
| $\sin x$ | $-\cos x + c$ | - |
| $\cos x$ | $\sin x + c$ | - |
| $\sec^2 x$ | $\tan x + c$ | - |
| $\csc^2 x$ | $-\cot x + c$ | - |
| $\sec x \tan x$ | $\sec x + c$ | - |
| $\csc x \cot x$ | $-\csc x + c$ | - |
| $\tan x$ | $-\ln\lvert\cos x\rvert + c = \ln\lvert\sec x\rvert + c$ | - |
| $\cot x$ | $\ln\lvert\sin x\rvert + c$ | - |
| $\sec x$ | $\ln\lvert\sec x + \tan x\rvert + c$ | - |
| $\csc x$ | $\ln\lvert\csc x - \cot x\rvert + c$ | - |

### 🔹 বিপরীত ত্রিকোণমিতি সংক্রান্ত সূত্র
*   $\int \frac{dx}{\sqrt{1-x^2}} = \sin^{-1}x + c$
*   $\int \frac{dx}{1+x^2} = \tan^{-1}x + c$
*   $\int \frac{dx}{x\sqrt{x^2-1}} = \sec^{-1}x + c$

---

## 🛠️ ২. যোগজীকরণের বিভিন্ন পদ্ধতি (Techniques of Integration)

### 🔹 ১. প্রতিস্থাপন পদ্ধতি (Method of Substitution)
যখন যোগজের ভেতরের ফাংশন এবং তার অন্তরজ একসাথে থাকে, তখন প্রতিস্থাপন পদ্ধতি ব্যবহার করা হয়।
*   **নিয়ম:** $\int f(g(x)) \cdot g'(x) dx$ আকারে থাকলে, $g(x) = z$ ধরতে হবে। তবে $g'(x)dx = dz$ হবে।
*   **উদাহরণ:** $\int \sin^3 x \cos x \, dx$ এখানে $\sin x = z$ ধরলে, $\cos x \, dx = dz$ হবে। যোগজটি হবে $\int z^3 dz$।

### 🔹 ২. ত্রিকোণমিতিক গুণফলকে যোগফলে রূপান্তর
সরাসরি যোগজ করা যায় না এমন ত্রিকোণমিতিক গুণফল থাকলে (যেমন $\sin A \cos B$ বা $\sin^2 x$), নিচের সূত্রগুলো ব্যবহার করে যোগফলে রূপান্তর করতে হয়:
*   $\sin^2 x = \frac{1}{2}(1 - \cos 2x)$
*   $\cos^2 x = \frac{1}{2}(1 + \cos 2x)$
*   $2 \sin A \cos B = \sin(A+B) + \sin(A-B)$
*   $2 \cos A \cos B = \cos(A+B) + \cos(A-B)$
*   $2 \sin A \sin B = \cos(A-B) - \cos(A+B)$

### 🔹 ৩. কিছু বিশেষ স্ট্যান্ডার্ড যোগজ (Special Standard Integrals)
| যোগজ | মান |
| :--- | :--- |
| $\int \frac{dx}{a^2 + x^2}$ | $\frac{1}{a} \tan^{-1}\left(\frac{x}{a}\right) + c$ |
| $\int \frac{dx}{a^2 - x^2}$ | $\frac{1}{2a} \ln\left\lvert\frac{a+x}{a-x}\right\rvert + c$ |
| $\int \frac{dx}{x^2 - a^2}$ | $\frac{1}{2a} \ln\left\lvert\frac{x-a}{x+a}\right\rvert + c$ |
| $\int \frac{dx}{\sqrt{a^2 - x^2}}$ | $\sin^{-1}\left(\frac{x}{a}\right) + c$ |
| $\int \frac{dx}{\sqrt{x^2 + a^2}}$ | $\ln\left\lvert x + \sqrt{x^2 + a^2}\right\rvert + c$ |
| $\int \frac{dx}{\sqrt{x^2 - a^2}}$ | $\ln\left\lvert x + \sqrt{x^2 - a^2}\right\rvert + c$ |
| $\int \sqrt{a^2 - x^2} \, dx$ | $\frac{x}{2}\sqrt{a^2 - x^2} + \frac{a^2}{2}\sin^{-1}\left(\frac{x}{a}\right) + c$ |

> 💡 **Exam Tip:** যদি $\sqrt{a^2 - x^2}$ থাকে, তবে $x = a\sin\theta$ ধরতে হয়। যদি $\sqrt{a^2 + x^2}$ থাকে, তবে $x = a\tan\theta$ এবং $\sqrt{x^2 - a^2}$ থাকলে $x = a\sec\theta$ ধরতে হয়।

<!-- MAT-1st-C10-I01 -->

![A right-angled triangle illustrating trigonometric substitution for \sqrt{a^2 - x^2} with angle \theta, side a and x.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718331/image_e743aea1_1_i63xhl.jpg)

### 🔹 ৪. আংশিক সমাকলন বা অংশক্রম পদ্ধতি (Integration by Parts)
দুটি ভিন্ন ধরনের ফাংশনের গুণফল থাকলে এই পদ্ধতি ব্যবহার করা হয় (যেমন: $x \sin x$, $x^2 e^x$, $\ln x$)।

$$
\int u v \, dx = u \int v \, dx - \int \left( \frac{du}{dx} \int v \, dx \right) dx
$$


*   **LIATE শর্টকাট:** প্রথম ফাংশন $u$ এবং দ্বিতীয় ফাংশন $v$ নির্ণয়ের জন্য LIATE শব্দটি মনে রাখতে হবে। যে ফাংশনটি আগে আসবে সেটি $u$ হবে।
    *   **L** (Logarithmic Function - লগারিদমিক)
    *   **I** (Inverse Trigonometric - বিপরীত ত্রিকোণমিতি)
    *   **A** (Algebraic - বীজগাণিতিক, যেমন $x, x^2$)
    *   **T** (Trigonometric - ত্রিকোণমিতিক)
    *   **E** (Exponential - সূচকীয়, যেমন $e^x$)

**বিশেষ সূত্র (Special Formula):**
*   $\int e^x [f(x) + f'(x)] dx = e^x f(x) + c$
*   $\int e^{ax} \sin(bx) dx$ এবং $\int e^{ax} \cos(bx) dx$ এর ক্ষেত্রে দুইবার By Parts করতে হয়।

### 🔹 ৫. আংশিক ভগ্নাংশ পদ্ধতি (Method of Partial Fractions)
যখন যোগজের ভেতরের রাশি একটি ভগ্নাংশ ($\frac{P(x)}{Q(x)}$) এবং লবের ডিগ্রি হরের ডিগ্রির চেয়ে ছোট, তখন হরকে উৎপাদকে ভেঙে ভগ্নাংশটিকে ছোট ছোট ভগ্নাংশে ভাগ করতে হয়। 

| হরের গঠন | আংশিক ভগ্নাংশের রূপ |
| :--- | :--- |
| $(x-a)(x-b)$ | $\frac{A}{x-a} + \frac{B}{x-b}$ |
| $(x-a)^2$ | $\frac{A}{x-a} + \frac{B}{(x-a)^2}$ |
| $(x^2+a^2)$ | $\frac{Ax+B}{x^2+a^2}$ |

---

## 📏 ৩. নির্দিষ্ট যোগজ (Definite Integral)

যখন যোগজের নির্দিষ্ট ঊর্ধ্ব ও নিম্নসীমা থাকে (যেমন: $\int_a^b f(x) dx$), তখন এটি নির্দিষ্ট যোগজ। 

### 🔹 মৌলিক উপপাদ্য (Fundamental Theorem of Calculus)

$$
\int_a^b f(x) dx = F(b) - F(a)
$$

*(যেখানে $F(x)$ হলো $f(x)$ এর যেকোনো একটি অনির্দিষ্ট যোগজ, অর্থাৎ $F'(x) = f(x)$)*

### 🔹 নির্দিষ্ট যোগজের ধর্মাবলি (Properties)
এগুলো এক্সামে খুব কাজে লাগে:
1.  $\int_a^b f(x) dx = -\int_b^a f(x) dx$
2.  $\int_a^b f(x) dx = \int_a^b f(a+b-x) dx$
3.  $\int_0^a f(x) dx = \int_0^a f(a-x) dx$
4.  $\int_{-a}^a f(x) dx = 2\int_0^a f(x) dx$ (যদি $f(x)$ জোড় ফাংশন হয়, $f(-x) = f(x)$)
5.  $\int_{-a}^a f(x) dx = 0$ (যদি $f(x)$ বিজোড় ফাংশন হয়, $f(-x) = -f(x)$)
6.  $\int_0^{2a} f(x) dx = 2\int_0^a f(x) dx$ (যদি $f(2a-x) = f(x)$)

---

## 📐 ৪. যোগজের জ্যামিতিক প্রয়োগ: ক্ষেত্রফল নির্ণয়

বক্ররেখা, x-অক্ষ এবং দুটি নির্দিষ্ট রেখা ($x=a$ এবং $x=b$) দ্বারা আবদ্ধ ক্ষেত্রের ক্ষেত্রফল:

$$
\text{Area} = \int_a^b y \, dx = \int_a^b f(x) dx
$$


<!-- MAT-1st-C10-I02 -->

![A curve y=f(x) above the x-axis, with vertical lines x=a and x=b. The area under the curve is shaded.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718407/image_93be4802_1_1_jfxylk.jpg)

*   যদি বক্ররেখা x-অক্ষের নিচে থাকে, তবে ক্ষেত্রফলের মান ঋণাত্মক আসে, সেক্ষেত্রে শুধু পরমমান (Absolute value) নিতে হয়।
*   দুটি বক্ররেখা $y=f(x)$ এবং $y=g(x)$ এর মধ্যবর্তী ক্ষেত্রফল:
    $\text{Area} = \int_a^b [f(x) - g(x)] dx$ (যখন $f(x) > g(x)$)

---

## 📊 ৫. সাংখ্যিক সমাকলন: ট্রাপিজয়ডাল সূত্র (Trapezoidal Rule)

যখন ফাংশনের সরাসরি যোগজ নির্ণয় কঠিন বা অসম্ভব, তখন নির্দিষ্ট যোগজের আসন্ন মান বের করার জন্য এই সূত্র ব্যবহার করা হয়। 
ধরা যাক, $[a, b]$ ব্যবধানকে $n$ সংখ্যক সমান ভাগে ভাগ করা হলো। প্রতিটি ভাগের প্রস্থ $h = \frac{b-a}{n}$। 

$$
\int_a^b f(x) dx \approx \frac{h}{2} \left[ (y_0 + y_n) + 2(y_1 + y_2 + ... + y_{n-1}) \right]
$$

*(যেখানে $y_0 = f(a)$, $y_1 = f(a+h)$, ... $y_n = f(b)$)*

<!-- MAT-1st-C10-I03 -->

![A curve approximated by trapeziums, showing x-coordinates x_0, x_1, ... x_n and corresponding y-coordinates.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718454/image_d1a347d_1_p47pm2.jpg)

---

## 🎁 ফর্মুলা ব্যাংক (Quick Revision Table)

| কনসেপ্ট | মূল সূত্র |
| :--- | :--- |
| পাওয়ার রুল | $\int x^n dx = \frac{x^{n+1}}{n+1} + c$ |
| $\sin^2 x$ এর যোগজ | $\int \sin^2 x \, dx = \int \frac{1-\cos 2x}{2} dx$ |
| আংশিক সমাকলন | $\int uv \, dx = u\int v \, dx - \int (u' \int v \, dx) dx$ |
| LIATE শর্টকাট | Log, Inverse, Algebraic, Trig, Exp (প্রথমটি $u$) |
| নির্দিষ্ট যোগজ | $\int_a^b f(x) dx = F(b) - F(a)$ |
| সিমেট্রি প্রপার্টি | $\int_{-a}^a f(x) dx = 2\int_0^a f(x) dx$ (Even) |
| ক্ষেত্রফল | $\int_a^b f(x) dx$ |
| ট্রাপিজয়ডাল সূত্র | $A \approx \frac{h}{2}[(y_0 + y_n) + 2(y_1 + ... + y_{n-1})]$ |

> 🧠 **Memory Hack:**
> *   **LIATE:** লগ (L) কে সবসময় আগে ধরবে, এক্সপোনেনশিয়াল (E) কে সবার শেষে।
> *   **Definite Integral:** যোগজ ধ্রুবক ($c$) এর কোনো দরকার নেই, শুধু উপরের সীমা বসিয়ে নিচের সীমা বিয়োগ করো।
> *   **Area:** $x$-অক্ষের সাপেক্ষে ক্ষেত্রফল হলে $y \, dx$, আর $y$-অক্ষের সাপেক্ষে হলে $x \, dy$।