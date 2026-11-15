# 📚 HSC উচ্চতর গণিত ১ম পত্র - অধ্যায় ৯: অন্তরীকরণ (Differentiation)

> **অধ্যায়ের সারাংশ:** ক্যালকুলাসের সবচেয়ে গুরুত্বপূর্ণ অধ্যায়। এখানে সীমা (Limit), অন্তরজ (Derivative) নির্ণয়ের সব নিয়ম, উচ্চতর অন্তরজ এবং জ্যামিতিক ও ভৌত প্রয়োগগুলো অত্যন্ত গোছানোভাবে দেওয়া হলো। 

---

## 📌 ১. সীমা ও ধারাবাহিকতা (Limit & Continuity)

**সীমা (Limit):** $x$ চলকের মান একটি নির্দিষ্ট সংখ্যা $a$ এর দিকে অগ্রসর হলে $f(x)$ ফাংশনের মান যে নির্দিষ্ট সংখ্যার দিকে অগ্রসর হয়, তাকে $x \to a$ এর জন্য $f(x)$ এর সীমা বলে।

### 🔹 সীমার প্রকারভেদ
*   **বামদিকের সীমা (Left Hand Limit):** $x \to a^-$ বা $x \to a-0$ (বাম দিক থেকে আসা)।
*   **ডানদিকের সীমা (Right Hand Limit):** $x \to a^+$ বা $x \to a+0$ (ডান দিক থেকে আসা)।
*   **সীমা বিদ্যমান থাকার শর্ত:** 

$$
\lim_{x \to a^-} f(x) = \lim_{x \to a^+} f(x) = L
$$

*   **ধারাবাহিকতা (Continuity) শর্ত:** $x = a$ বিন্দুতে $f(x)$ ধারাবাহিক হবে যদি $\lim_{x \to a} f(x) = f(a)$ হয়।

### 🔹 গুরুত্বপূর্ণ সীমার সূত্র (Standard Limit Formulas)
| সূত্র | মান | শর্ত |
| :--- | :--- | :--- |
| $\lim_{x \to 0} \frac{\sin x}{x}$ | $1$ | $x$ রেডিয়ানে |
| $\lim_{x \to 0} \frac{\tan x}{x}$ | $1$ | $x$ রেডিয়ানে |
| $\lim_{x \to 0} \frac{1 - \cos x}{x^2}$ | $\frac{1}{2}$ | - |
| $\lim_{x \to 0} \frac{e^x - 1}{x}$ | $1$ | - |
| $\lim_{x \to 0} \frac{a^x - 1}{x}$ | $\ln a$ | $a > 0$ |
| $\lim_{x \to 0} \frac{\ln(1+x)}{x}$ | $1$ | - |
| $\lim_{x \to 0} (1 + x)^{\frac{1}{x}}$ | $e$ | - |
| $\lim_{x \to \infty} (1 + \frac{1}{n})^n$ | $e$ | - |
| $\lim_{x \to a} \frac{x^n - a^n}{x - a}$ | $na^{n-1}$ | - |

---

## 🎯 ২. অন্তরজের মৌলিক ধারণা (Basic Derivative)

**অন্তরজ (Derivative):** স্বাধীন চলক $x$ এর ক্ষুদ্র পরিবর্তনের সাপেক্ষে অধীন চলক $y$ এর পরিবর্তনের হারকে অন্তরজ বলে। একে $\frac{dy}{dx}$, $f'(x)$, $y_1$ বা $D y$ দ্বারা প্রকাশ করা হয়।

### 🔹 মূল নিয়মে অন্তরজ (Derivative from First Principle)

$$
\frac{dy}{dx} = f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}
$$

$$
\text{অথবা, } f'(a) = \lim_{x \to a} \frac{f(x) - f(a)}{x - a}
$$


---

## 🧮 ৩. অন্তরজের সূত্রাবলি (Formula Bank)

### 🔹 বীজগাণিতিক ও সূচক ফাংশন
| ফাংশন $f(x)$ | অন্তরজ $\frac{d}{dx} f(x)$ |
| :--- | :--- |
| $x^n$ | $nx^{n-1}$ |
| $c$ (ধ্রুবক) | $0$ |
| $e^x$ | $e^x$ |
| $a^x$ | $a^x \ln a$ |
| $\ln x$ | $\frac{1}{x}$ |
| $\log_a x$ | $\frac{1}{x \ln a}$ |

### 🔹 ত্রিকোণমিতিক ফাংশন
| ফাংশন $f(x)$ | অন্তরজ $\frac{d}{dx} f(x)$ |
| :--- | :--- |
| $\sin x$ | $\cos x$ |
| $\cos x$ | $-\sin x$ |
| $\tan x$ | $\sec^2 x$ |
| $\cot x$ | $-\csc^2 x$ |
| $\sec x$ | $\sec x \tan x$ |
| $\csc x$ | $-\csc x \cot x$ |

### 🔹 বিপরীত ত্রিকোণমিতিক ফাংশন
| ফাংশন $f(x)$ | অন্তরজ $\frac{d}{dx} f(x)$ |
| :--- | :--- |
| $\sin^{-1} x$ | $\frac{1}{\sqrt{1-x^2}}$ |
| $\cos^{-1} x$ | $-\frac{1}{\sqrt{1-x^2}}$ |
| $\tan^{-1} x$ | $\frac{1}{1+x^2}$ |
| $\cot^{-1} x$ | $-\frac{1}{1+x^2}$ |
| $\sec^{-1} x$ | $\frac{1}{x\sqrt{x^2-1}}$ |
| $\csc^{-1} x$ | $-\frac{1}{x\sqrt{x^2-1}}$ |

---

## 🛠️ ৪. অন্তরীকরণের বিভিন্ন পদ্ধতি (Techniques of Differentiation)

### 🔹 গুণফল ও ভাগফলের নিয়ম (Product & Quotient Rule)
*   **গুণফল (Product Rule):** $\frac{d}{dx}(uv) = u\frac{dv}{dx} + v\frac{du}{dx}$
*   **ভাগফল (Quotient Rule):** $\frac{d}{dx}(\frac{u}{v}) = \frac{v\frac{du}{dx} - u\frac{dv}{dx}}{v^2}$

### 🔹 শৃঙ্খল বিধি (Chain Rule)
যদি $y = f(u)$ এবং $u = g(x)$ হয়, তবে 

$$
\frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx}
$$

*(উদাহরণ: $\frac{d}{dx}\sin(x^2) = \cos(x^2) \cdot 2x$)*

### 🔹 লগারিদমিক অন্তরীকরণ (Logarithmic Differentiation)
যখন ফাংশনটি $y = u^v$ আকারে থাকে (যেখানে $u$ এবং $v$ উভয়েই $x$ এর ফাংশন), তখন দুই পক্ষে $\ln$ নিয়ে অন্তরীকরণ করা হয়।

$$
\ln y = v \ln u \Rightarrow \frac{1}{y}\frac{dy}{dx} = v \cdot \frac{1}{u}\frac{du}{dx} + \ln u \cdot \frac{dv}{dx}
$$


### 🔹 পরামিতিক অন্তরীকরণ (Parametric Differentiation)
যদি $x = f(t)$ এবং $y = g(t)$ হয়, তবে 
$\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$ (শর্ত: $\frac{dx}{dt} \neq 0$)

### 🔹 অপ্রকাশ্য অন্তরীকরণ (Implicit Differentiation)
যখন $x$ ও $y$ এর সম্পর্ক সরাসরি $y = f(x)$ আকারে প্রকাশ করা যায় না (যেমন: $x^2 + y^2 = 25$), তখন উভয় পক্ষকে $x$ এর সাপেক্ষে অন্তরীকরণ করে $\frac{dy}{dx}$ বের করা হয়।

---

## 🔄 ৫. উচ্চতর অন্তরজ (Higher Order Derivative)

কোনো ফাংশনের প্রথম অন্তরজকে পুনরায় অন্তরীকরণ করলে দ্বিতীয় অন্তরজ পাওয়া যায়। একে $\frac{d^2y}{dx^2}$, $y_2$ বা $f''(x)$ দ্বারা প্রকাশ করা হয়।

*   **$n$-তম অন্তরজের সূত্র:**
    *   $D^n (e^{ax}) = a^n e^{ax}$
    *   $D^n (a^x) = a^x (\ln a)^n$
    *   $D^n \{\sin(ax+b)\} = a^n \sin\left(ax+b + \frac{n\pi}{2}\right)$
    *   $D^n \{\cos(ax+b)\} = a^n \cos\left(ax+b + \frac{n\pi}{2}\right)$

---

## 📈 ৬. অন্তরজের প্রয়োগ (Applications of Derivative)

### 🔹 জ্যামিতিক প্রয়োগ (Geometrical Application)
*   **স্পর্শকের ঢাল (Slope of Tangent):** $(x_1, y_1)$ বিন্দুতে স্পর্শকের ঢাল $m = \left(\frac{dy}{dx}\right)_{(x_1, y_1)}$
*   **স্পর্শকের সমীকরণ:** $y - y_1 = m(x - x_1)$
*   **অভিলম্বের ঢাল (Slope of Normal):** $m_1 = -\frac{1}{m}$
*   **অভিলম্বের সমীকরণ:** $y - y_1 = -\frac{1}{m}(x - x_1)$

<!-- MAT-1st-C09-I01 -->

![A curve showing tangent and normal at a point (x1, y1). Tangent angle \theta with x-axis.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718221/image_f450f425_1_w39hjy.jpg)

### 🔹 ক্রমবর্ধমান ও ক্রমহ্রাসমান ফাংশন (Increasing & Decreasing Function)
*   যদি নির্দিষ্ট ব্যবধিতে $f'(x) > 0$ হয়, তবে ফাংশনটি **ক্রমবর্ধমান (Increasing)**।
*   যদি নির্দিষ্ট ব্যবধিতে $f'(x) < 0$ হয়, তবে ফাংশনটি **ক্রমহ্রাসমান (Decreasing)**।

<!-- MAT-1st-C09-I02 -->

![Graph showing increasing function (positive slope) and decreasing function (negative slope).](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718286/image_9b0d6247_1_itpjkq.jpg)

### 🔹 চরম মান (Maxima and Minima)
১. $f'(x) = 0$ ধরে ক্রান্তি বিন্দু (Critical Points) বের করতে হবে।
২. দ্বিতীয় অন্তরজ পরীক্ষা (Second Derivative Test):
*   যদি $f''(x) < 0$ হয় ➡️ **সর্বোচ্চ মান (Maximum)**
*   যদি $f''(x) > 0$ হয় ➡️ **সর্বনিম্ন মান (Minimum)**

---

## 📏 ৭. অন্তরক (Differentials)
স্বাধীন চলক $x$ এর ক্ষুদ্র বৃদ্ধি $dx$ এবং অধীন চলক $y$ এর অনুরূপ বৃদ্ধি $dy$ এর মধ্যে সম্পর্ক:

$$
dy = f'(x)dx
$$

*   $dx = \delta x$ (স্বাধীন চলকের পরিবর্তন)
*   $dy \approx \delta y$ (অধীন চলকের পরিবর্তন)

---

## 🎁 ফর্মুলা ব্যাংক (Quick Revision Table)

| কনসেপ্ট | সূত্র / মান |
| :--- | :--- |
| সীমার মূল সূত্র | $\lim_{x \to 0} \frac{\sin x}{x} = 1$ |
| প্রথম নিয়ম | $f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$ |
| গুণফল নিয়ম | $(uv)' = u'v + uv'$ |
| ভাগফল নিয়ম | $(u/v)' = \frac{u'v - uv'}{v^2}$ |
| শৃঙ্খল নিয়ম | $\frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx}$ |
| স্পর্শকের সমীকরণ | $y - y_1 = m(x - x_1)$ |
| অভিলম্বের সমীকরণ | $y - y_1 = -\frac{1}{m}(x - x_1)$ |
| সর্বোচ্চ মান শর্ত | $f'(x)=0$ এবং $f''(x) < 0$ |
| সর্বনিম্ন মান শর্ত | $f'(x)=0$ এবং $f''(x) > 0$ |

> 🧠 **Memory Hack:** 
> * অন্তরজ মানে পরিবর্তনের হার। 
> * $\sin$ এর অন্তরজ $\cos$ (চিহ্ন পরিবর্তন হয় না), $\cos$ এর অন্তরজ $-\sin$ (চিহ্ন পরিবর্তন হয়)। 
> * স্পর্শক ও অভিলম্বের ঢালের গুণফল সর্বদা $-1$। 
> * সর্বোচ্চ মানে চূড়া (উল্টানো বাটি $\cap$), তাই $f''(x) < 0$; সর্বনিম্ন মানে গর্ত (বাটি $\cup$), তাই $f''(x) > 0$।