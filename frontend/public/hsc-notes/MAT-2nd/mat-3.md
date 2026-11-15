# 📚 HSC উচ্চতর গণিত ২য় পত্র - অধ্যায় ৩: জটিল সংখ্যা (Complex Numbers)

> **অধ্যায়ের সারাংশ:** বাস্তব সংখ্যার সীমাবদ্ধতা দূর করতে এবং দ্বিঘাত সমীকরণের কাল্পনিক মূল (যেমন: $\sqrt{-1}$) ব্যাখ্যা করতে জটিল সংখ্যার জন্ম। এই অধ্যায়ে জটিল সংখ্যার বীজগণিত, জ্যামিতিক রূপ, ডি ময়ভার্স উপপাদ্য এবং এককের ঘনমূলের অসাধারণ প্রয়োগগুলো একদম গোছানোভাবে দেওয়া হলো।

---

## 🎯 ১. মৌলিক ধারণা (Basic Concepts)

**জটিল সংখ্যা (Complex Number):** $x$ এবং $y$ বাস্তব সংখ্যা হলে, $z = x + iy$ আকারের সংখ্যাকে জটিল সংখ্যা বলে। এখানে $i$ হলো কাল্পনিক একক (Imaginary Unit), যেখানে $i = \sqrt{-1}$ বা $i^2 = -1$।

*   **বাস্তব অংশ (Real Part):** $x = \text{Re}(z)$
*   **কাল্পনিক অংশ (Imaginary Part):** $y = \text{Im}(z)$
*   **আর্গন্ড তল (Argand Plane):** জটিল সংখ্যা $z = x + iy$ কে কার্তেসীয় তলে $(x, y)$ বিন্দু দ্বারা প্রকাশ করার পদ্ধতি। $x$-অক্ষকে বাস্তব অক্ষ এবং $y$-অক্ষকে কাল্পনিক অক্ষ বলে।

### 🔄 $i$ এর ঘাতের চক্র (Power Cycle of $i$)
$i$ এর ঘাতগুলো সর্বদা ৪টি মানের পর পুনরাবৃত্তি করে:
*   $i^1 = i$
*   $i^2 = -1$
*   $i^3 = -i$
*   $i^4 = 1$
> 💡 **Exam Tip:** $i$ এর যেকোনো বড় ঘাত নির্ণয়ের জন্য ঘাতটিকে ৪ দিয়ে ভাগ করে ভাগশেষ (Remainder) বের করুন। যেমন: $i^{37} = i^{4 \times 9 + 1} = i^1 = i$।

---

## 🧮 ২. জটিল সংখ্যার বীজগাণিতিক প্রক্রিয়া (Algebraic Operations)

$z_1 = x_1 + iy_1$ এবং $z_2 = x_2 + iy_2$ হলে:
*   **যোগ (Addition):** $z_1 + z_2 = (x_1 + x_2) + i(y_1 + y_2)$
*   **বিয়োগ (Subtraction):** $z_1 - z_2 = (x_1 - x_2) + i(y_1 - y_2)$
*   **গুণ (Multiplication):** $z_1 \cdot z_2 = (x_1x_2 - y_1y_2) + i(x_1y_2 + x_2y_1)$
*   **ভাগ (Division):** $\frac{z_1}{z_2} = \frac{x_1x_2 + y_1y_2}{x_2^2 + y_2^2} + i\frac{x_2y_1 - x_1y_2}{x_2^2 + y_2^2}$ (হরের অনুবন্ধী দিয়ে গুণ করে)।

### 🔹 অনুবন্ধী জটিল সংখ্যা (Conjugate Complex Number)
$z = x + iy$ এর অনুবন্ধী হলো $\bar{z} = x - iy$।
*   $z \cdot \bar{z} = x^2 + y^2$ (যা একটি বাস্তব সংখ্যা)
*   $\overline{z_1 \pm z_2} = \bar{z_1} \pm \bar{z_2}$
*   $\overline{z_1 \cdot z_2} = \bar{z_1} \cdot \bar{z_2}$

---

## 📐 ৩. মডুলাস ও আর্গুমেন্ট (Modulus & Argument)

$z = x + iy$ হলে:
*   **মডুলাস (Modulus):** $|z| = r = \sqrt{x^2 + y^2}$। এটি মূলবিন্দু থেকে $z$ বিন্দুর দূরত্ব।
*   **আর্গুমেন্ট (Argument):** $\arg(z) = \theta = \tan^{-1}\left(\frac{y}{x}\right)$। এটি $x$-অক্ষের ধনাত্মক দিকের সাথে উৎপন্ন কোণ।

<!-- MAT-2nd-C03-I01 -->

![An Argand diagram showing point P(x,y) representing z=x+iy. A line from origin to P with length r and angle \theta with x-axis. Show the projections x and y.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793719092/image_5eeb645c_1_dzceuf.jpg)

### 🔹 চতুর্ভাগ অনুযায়ী আর্গুমেন্ট (Argument in Quadrants)
| চতুর্ভাগ (Quadrant) | $x$ ও $y$ এর চিহ্ন | মুখ্য আর্গুমেন্টের মান ($\theta$) | শর্ত |
| :--- | :--- | :--- | :--- |
| **প্রথম (I)** | $+ , +$ | $\tan^{-1}\left(\frac{y}{x}\right)$ | $0 < \theta < \frac{\pi}{2}$ |
| **দ্বিতীয় (II)** | $- , +$ | $\pi - \tan^{-1}\left(\frac{\lvert y\rvert}{\lvert x\rvert}\right)$ | $\frac{\pi}{2} < \theta < \pi$ |
| **তৃতীয় (III)** | $- , -$ | $-\pi + \tan^{-1}\left(\frac{\lvert y\rvert}{\lvert x\rvert}\right)$ অথবা $\pi + \tan^{-1}\left(\frac{y}{x}\right)$ | $-\pi < \theta < -\frac{\pi}{2}$ |
| **চতুর্থ (IV)** | $+ , -$ | $-\tan^{-1}\left(\frac{\lvert y\rvert}{x}\right)$ | $-\frac{\pi}{2} < \theta < 0$ |

*   **মুখ্য আর্গুমেন্টের সীমা:** $-\pi < \theta \le \pi$।
*   **গুরুত্বপূর্ণ ধর্ম:** $|z_1z_2| = |z_1||z_2|$ এবং $\arg(z_1z_2) = \arg(z_1) + \arg(z_2)$।

---

## 📈 ৪. পোলার আকার ও ডি ময়ভার্স উপপাদ্য (Polar Form & De Moivre's Theorem)

*   **পোলার আকার (Polar Form):** $z = r(\cos\theta + i\sin\theta)$।
*   **সূচকীয় আকার (Exponential Form):** $z = re^{i\theta}$ (অয়লারের সূত্র)।

**ডি ময়ভার্স উপপাদ্য (De Moivre's Theorem):**

$$
(\cos\theta + i\sin\theta)^n = \cos(n\theta) + i\sin(n\theta)
$$

*(যেখানে $n$ যেকোনো বাস্তব সংখ্যা)*
*   **প্রয়োগ:** $(x + iy)^n$ বা $\sqrt[n]{x+iy}$ আকারের জটিল সংখ্যাকে সহজে সরল করতে ব্যবহৃত হয়।

---

## 🧊 ৫. এককের ঘনমূল (Cube Roots of Unity) - **সবচেয়ে গুরুত্বপূর্ণ!**

$x^3 = 1$ সমীকরণের মূলগুলোকে এককের ঘনমূল বলে। এর তিনটি মূল হলো: $1, \omega, \omega^2$।
যেখানে, $\omega = \frac{-1 + \sqrt{3}i}{2}$ এবং $\omega^2 = \frac{-1 - \sqrt{3}i}{2}$।

<!-- MAT-2nd-C03-I02 -->

![An Argand diagram showing the three cube roots of unity placed at the vertices of an equilateral triangle inscribed in a unit circle. One at (1,0), others at 120^\circ and 240^\circ.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793719471/image_8c5c2dab_1_py8o7q.jpg)

### 🔹 $\omega$ এর অসাধারণ ধর্মাবলি (Properties of $\omega$)
১. $\omega^3 = 1$
২. $1 + \omega + \omega^2 = 0$
৩. $\omega^3 = \omega^6 = \omega^9 = ... = 1$
৪. $\omega^{3n+1} = \omega$ এবং $\omega^{3n+2} = \omega^2$ (যেখানে $n$ পূর্ণসংখ্যা)
৫. $\bar{\omega} = \omega^2$ এবং $\bar{\omega^2} = \omega$
৬. $\omega^2 + \omega + 1 = 0 \Rightarrow \omega + \frac{1}{\omega} = -1$

> 💡 **Exam Tip:** কোনো বড় ঘাতের $\omega$ (যেমন $\omega^{100}$) এর মান বের করতে, ঘাতটিকে ৩ দিয়ে ভাগ করে ভাগশেষ দেখুন। ভাগশেষ ১ হলে মান হবে $\omega$, ভাগশেষ ২ হলে $\omega^2$, আর ভাগশেষ ০ হলে ১।

---

## 🛤️ ৬. সঞ্চারপথ (Locus)

$z = x + iy$ হলে বিভিন্ন জ্যামিতিক সমীকরণের সঞ্চারপথ:

| সমীকরণ | জ্যামিতিক সঞ্চারপথ (Locus) | বর্ণনা |
| :--- | :--- | :--- |
| **$\lvert z - z_0\rvert = r$** | বৃত্ত (Circle) | কেন্দ্র $z_0$ এবং ব্যাসার্ধ $r$। |
| **$\lvert z - z_1\rvert = \lvert z - z_2\rvert$** | সরলরেখা (Straight Line) | $z_1$ ও $z_2$ বিন্দুর সংযোগ রেখার লম্ব সমদ্বিখণ্ডক। |
| **$\lvert z - z_1\rvert + \lvert z - z_2\rvert = 2a$** | উপবৃত্ত (Ellipse) | উপকেন্দ্র $z_1, z_2$, বৃহৎ অক্ষ $2a$ (শর্ত: $2a > \lvert z_1 - z_2\rvert$)। |
| **$\lvert z - z_1\rvert - \lvert z - z_2\rvert = 2a$** | অধিবৃত্ত (Hyperbola) | উপকেন্দ্র $z_1, z_2$, আড় অক্ষ $2a$ (শর্ত: $2a < \lvert z_1 - z_2\rvert$)। |
| **$z\bar{z} + \bar{a}z + a\bar{z} + b = 0$** | বৃত্ত (Circle) | কেন্দ্র $-a$ এবং ব্যাসার্ধ $\sqrt{\lvert a\rvert^2 - b}$ |

---

## 🎁 ৭. ফর্মুলা ব্যাংক (Quick Revision Table)

| কনসেপ্ট | সূত্র / মান |
| :--- | :--- |
| কাল্পনিক একক | $i = \sqrt{-1}$ |
| মডুলাস | $\lvert z\rvert = \sqrt{x^2 + y^2}$ |
| অনুবন্ধী | $\bar{z} = x - iy$ |
| পোলার আকার | $z = r(\cos\theta + i\sin\theta)$ |
| ডি ময়ভার্স | $(\cos\theta + i\sin\theta)^n = \cos n\theta + i\sin n\theta$ |
| $\omega$ এর ধর্ম | $\omega^3 = 1, 1+\omega+\omega^2 = 0$ |
| $\lvert z_1z_2\rvert$ | $\lvert z_1\rvert\lvert z_2\rvert$ |
| $\arg(z_1z_2)$ | $\arg(z_1) + \arg(z_2)$ |
| $\lvert z_1+z_2\rvert$ এর সর্বোচ্চ | $\lvert z_1\rvert + \lvert z_2\rvert$ |
| $\lvert z_1+z_2\rvert$ এর সর্বনিম্ন | $\left\lvert\lvert z_1\rvert - \lvert z_2\rvert\right\rvert$ |

> 🧠 **Memory Hack:** 
> * $i$ এর ঘাত ৪ পর পর ফিরে আসে (i, -1, -i, 1)। 
> * $\omega$ এর ঘাত ৩ পর পর ফিরে আসে (1, $\omega$, $\omega^2$)। 
> * $|z - a| = r$ মানেই বৃত্ত, $|z - a| = |z - b|$ মানেই সরলরেখা। 
> * ডি ময়ভার্সে ঘাত বাইরে থাকলে কোণের সাথে সরাসরি গুণ হয়: $(\cos\theta + i\sin\theta)^n$।