# 📚 HSC উচ্চতর গণিত ১ম পত্র - অধ্যায় ২: ভেক্টর (Vector)

> **অধ্যায়ের সারাংশ:** এই অধ্যায়ের প্রতিটি সূত্র, জ্যামিতিক প্রমাণ এবং বীজগাণিতিক প্রয়োগ এখানে অত্যন্ত গোছানোভাবে দেওয়া হলো। ভেক্টরের দিক ও মান নিয়ে কনফিউশন দূর করতে ফ্লোচার্ট ও টেবিল ব্যবহার করা হয়েছে। 

---

## 🧭 ১. ভেক্টরের বেসিক (Vector Basics)

**ভেক্টর (Vector):** যে রাশির মান (Magnitude) এবং নির্দিষ্ট দিক (Direction) উভয়ই আছে, তাকে ভেক্টর বলে। (যেমন: সরণ, বেগ, বল)।
*   **ধারক (Support):** যে সরলরেখা বরাবর ভেক্টরটি ক্রিয়া করে।
*   **দিক (Sense):** ভেক্টরের প্রারম্ভিক বিন্দু থেকে প্রান্তবিন্দুর দিক।
*   **একক ভেক্টর (Unit Vector):** যে ভেক্টরের মান ১। কোনো ভেক্টর $\vec{a}$ এর দিক বরাবর একক ভেক্টর $\hat{a} = \frac{\vec{a}}{|\vec{a}|}$।

### 🔄 ভেক্টরের প্রকারভেদ (Types of Vectors)
| ভেক্টরের নাম | বৈশিষ্ট্য |
| :--- | :--- |
| **শূন্য ভেক্টর (Zero Vector)** | মান শূন্য, দিক অনির্দিষ্ট। প্রারম্ভিক ও প্রান্তবিন্দু একই। $\vec{AA} = \vec{0}$ |
| **সদৃশ (Like Vectors)** | দুইটি ভেক্টরের দিক একই, মান সমান বা অসমান হতে পারে। |
| **অসদৃশ (Unlike Vectors)** | দুইটি ভেক্টরের দিক পরস্পর বিপরীতমুখী। |
| **সমান (Equal Vectors)** | মান ও দিক উভয়ই সমান। $\vec{a} = \vec{b}$ |
| **বিপরীত (Negative Vector)** | মান সমান কিন্তু দিক বিপরীত। $\vec{AB} = -\vec{BA}$ |
| **সমরেখ (Collinear)** | দুইটি ভেক্টর একই সরলরেখা বা সমান্তরাল সরলরেখা বরাবর ক্রিয়া করলে। শর্ত: $\vec{a} = k\vec{b}$ |

---

## ➕ ২. ভেক্টরের যোগ, বিয়োগ ও স্কেলার গুণ (Vector Algebra)

### ১. যোগ (Addition)
*   **ত্রিভুজ সূত্র (Triangle Law):** $\vec{AB} + \vec{BC} = \vec{AC}$ (মাথা থেকে লেজ মিলানো)
*   **সামান্তরিক সূত্র (Parallelogram Law):** $\vec{OA} + \vec{OB} = \vec{OC}$ (লব্ধি হলো কর্ণ)

<!-- MAT-1st-C02-I01 -->

![A diagram showing Triangle Law of vector addition (A->B->C) and Parallelogram Law (O->A, O->B completing to C).](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793717654/image_9a7a80cf_1_ksjgrp.jpg)

### ২. বিয়োগ (Subtraction)
*   $\vec{a} - \vec{b} = \vec{a} + (-\vec{b})$
*   জ্যামিতিকভাবে: $\vec{OA} + \vec{AB} = \vec{OB} \Rightarrow \vec{AB} = \vec{OB} - \vec{OA} = \vec{b} - \vec{a}$

### ৩. স্কেলার গুণ (Scalar Multiplication)
*   $m\vec{a}$ একটি ভেক্টর, যার মান $= |m||\vec{a}|$।
*   $m > 0$ হলে দিক $\vec{a}$ এর দিকে, $m < 0$ হলে দিক বিপরীত, $m = 0$ হলে শূন্য ভেক্টর।

---

## 📍 ৩. অবস্থান ভেক্টর ও অনুপাত (Position Vector & Section Formula)

মূলবিন্দু $O$ এর সাপেক্ষে $A$ ও $B$ বিন্দুর অবস্থান ভেক্টর যথাক্রমে $\vec{a}$ ও $\vec{b}$ হলে, $\vec{AB} = \vec{b} - \vec{a}$।

**বিভাজন সূত্র (Section Formula):**
$A$ ও $B$ বিন্দুর সংযোগ রেখাংশকে $C$ বিন্দু $m:n$ অনুপাতে বিভক্ত করলে:
*   **অন্তর্বিভক্ত (Internal):** $C$ বিন্দুর অবস্থান ভেক্টর $\vec{c} = \frac{m\vec{b} + n\vec{a}}{m+n}$
*   **বহির্বিভক্ত (External):** $C$ বিন্দুর অবস্থান ভেক্টর $\vec{c} = \frac{m\vec{b} - n\vec{a}}{m-n}$
*   **মধ্যবিন্দু (Midpoint):** $m=n$ হলে, $\vec{c} = \frac{\vec{a} + \vec{b}}{2}$

> 💡 **Exam Tip:** $A, B, C$ সমরেখ হবে যদি এবং কেবল যদি $\vec{AC} = k \cdot \vec{AB}$ (যেখানে $k$ একটি স্কেলার) হয়।

---

## 📐 ৪. ভেক্টরকে $\hat{i}, \hat{j}, \hat{k}$ এর মাধ্যমে প্রকাশ

*   **দ্বিমাত্রিক (2D):** $\vec{r} = x\hat{i} + y\hat{j}$
    *   মান: $|\vec{r}| = \sqrt{x^2 + y^2}$
*   **ত্রিমাত্রিক (3D):** $\vec{r} = x\hat{i} + y\hat{j} + z\hat{k}$
    *   মান: $|\vec{r}| = \sqrt{x^2 + y^2 + z^2}$
*   **দিক কোসাইন (Direction Cosines):** যদি ভেক্টরটি $x, y, z$ অক্ষের সাথে যথাক্রমে $\alpha, \beta, \gamma$ কোণ উৎপন্ন করে, তবে $\cos\alpha = \frac{x}{|\vec{r}|}$, $\cos\beta = \frac{y}{|\vec{r}|}$, $\cos\gamma = \frac{z}{|\vec{r}|}$।
    *   $\cos^2\alpha + \cos^2\beta + \cos^2\gamma = 1$

---

## 🎯 ৫. ডট গুণন বা স্কেলার গুণন (Dot Product)

দুইটি ভেক্টরের ডট গুণফল একটি **স্কেলার** রাশি।

$$
\vec{a} \cdot \vec{b} = |\vec{a}||\vec{b}|\cos\theta
$$

যেখানে $\theta$ হলো $\vec{a}$ ও $\vec{b}$ এর মধ্যবর্তী কোণ ($0 \le \theta \le \pi$)।

*   **উপাংশে প্রকাশ:** $\vec{a} \cdot \vec{b} = a_1b_1 + a_2b_2 + a_3b_3$
*   **মধ্যবর্তী কোণ:** $\cos\theta = \frac{\vec{a} \cdot \vec{b}}{|\vec{a}||\vec{b}|}$
*   **লম্ব শর্ত (Perpendicular):** $\vec{a} \cdot \vec{b} = 0$  (যেহেতু $\cos 90^\circ = 0$)
*   **অভিক্ষেপ (Projection):** $\vec{b}$ এর উপর $\vec{a}$ এর অভিক্ষেপ (স্কেলার) $= \frac{\vec{a} \cdot \vec{b}}{|\vec{b}|} = |\vec{a}|\cos\theta$
*   **উপাংশ (Component):** $\vec{b}$ বরাবর $\vec{a}$ এর উপাংশ (ভেক্টর) $= \left(\frac{\vec{a} \cdot \vec{b}}{|\vec{b}|^2}\right)\vec{b}$
*   **কাজ (Work):** $W = \vec{F} \cdot \vec{d}$ (বল ও সরণের ডট গুণফল)

---

## 🔀 ৬. ক্রস গুণন বা ভেক্টর গুণন (Cross Product)

দুইটি ভেক্টরের ক্রস গুণফল একটি **ভেক্টর** রাশি।

$$
\vec{a} \times \vec{b} = |\vec{a}||\vec{b}|\sin\theta \hat{n}
$$

যেখানে $\hat{n}$ হলো $\vec{a}$ ও $\vec{b}$ এর সমতলের উপর লম্ব একক ভেক্টর (ডান হাতের নিয়ম অনুযায়ী)।

*   **নির্ণায়ক আকারে:**

$$
\vec{a} \times \vec{b} = \begin{vmatrix} \hat{i} & \hat{j} & \hat{k} \\ a_1 & a_2 & a_3 \\ b_1 & b_2 & b_3 \end{vmatrix}
$$

*   **সমান্তরাল শর্ত (Parallel):** $\vec{a} \times \vec{b} = \vec{0}$ (যেহেতু $\sin 0^\circ = 0$)
*   **ক্ষেত্রফল (Area):**
    *   সামান্তরিকের ক্ষেত্রফল $= |\vec{a} \times \vec{b}|$
    *   ত্রিভুজের ক্ষেত্রফল $= \frac{1}{2}|\vec{a} \times \vec{b}|$ (যেখানে $\vec{a}$ ও $\vec{b}$ ত্রিভুজের সন্নিহিত বাহু)
*   **টর্ক বা বলের ভ্রামক (Torque):** $\vec{\tau} = \vec{r} \times \vec{F}$

---

## 🧊 ৭. স্কেলার ট্রিপল গুণন (Scalar Triple Product)

তিনটি ভেক্টর $\vec{a}, \vec{b}, \vec{c}$ এর স্কেলার ট্রিপল গুণন:

$$
[\vec{a}\ \vec{b}\ \vec{c}] = \vec{a} \cdot (\vec{b} \times \vec{c}) = \begin{vmatrix} a_1 & a_2 & a_3 \\ b_1 & b_2 & b_3 \\ c_1 & c_2 & c_3 \end{vmatrix}
$$


*   **সমতলীয় শর্ত (Coplanarity):** তিনটি ভেক্টর সমতলীয় হবে যদি এবং কেবল যদি $[\vec{a}\ \vec{b}\ \vec{c}] = 0$ হয়।
*   **আয়তন (Volume):** সামান্তরিক ঘনবস্তুর (Parallelepiped) আয়তন $= |[\vec{a}\ \vec{b}\ \vec{c}]|$

---

## 📏 ৮. সরলরেখা ও সমতলের ভেক্টর সমীকরণ

### 🔹 সরলরেখা (Straight Line)
1.  **নির্দিষ্ট বিন্দু ও সমান্তরাল:** $A(\vec{a})$ বিন্দুগামী এবং $\vec{b}$ ভেক্টরের সমান্তরাল সরলরেখার সমীকরণ:

$$
\vec{r} = \vec{a} + t\vec{b}
$$

    *(যেখানে $t$ একটি প্যারামিটার)*
2.  **দুইটি নির্দিষ্ট বিন্দুগামী:** $A(\vec{a})$ ও $B(\vec{b})$ বিন্দুগামী সরলরেখার সমীকরণ:

$$
\vec{r} = \vec{a} + t(\vec{b} - \vec{a}) = (1-t)\vec{a} + t\vec{b}
$$

    *   **কার্তেসীয় রূপ:** $\frac{x-a_1}{b_1-a_1} = \frac{y-a_2}{b_2-a_2} = \frac{z-a_3}{b_3-a_3}$

### 🔹 সমতল (Plane)
1.  $A(\vec{a})$ বিন্দুগামী এবং $\vec{n}$ ভেক্টরের (Normal Vector) উপর লম্ব সমতলের সমীকরণ:

$$
(\vec{r} - \vec{a}) \cdot \vec{n} = 0
$$

    বা, $\vec{r} \cdot \vec{n} = \vec{a} \cdot \vec{n} = d$ (যেখানে $d$ মূলবিন্দু থেকে সমতলের লম্ব দূরত্ব)

---

## 🎁 ফর্মুলা ব্যাংক (Quick Revision Table)

| কনসেপ্ট | গাণিতিক রূপ (LaTeX) |
| :--- | :--- |
| একক ভেক্টর | $\hat{a} = \frac{\vec{a}}{\lvert\vec{a}\rvert}$ |
| অবস্থান ভেক্টর দূরত্ব | $\lvert\vec{AB}\rvert = \lvert\vec{b} - \vec{a}\rvert$ |
| ডট গুণফল | $\vec{a} \cdot \vec{b} = a_1b_1 + a_2b_2 + a_3b_3$ |
| কোণ নির্ণয় | $\theta = \cos^{-1}\left(\frac{\vec{a} \cdot \vec{b}}{\lvert\vec{a}\rvert\lvert\vec{b}\rvert}\right)$ |
| ক্রস গুণফল | $\vec{a} \times \vec{b} = \begin{vmatrix} \hat{i} & \hat{j} & \hat{k} \\ a_1 & a_2 & a_3 \\ b_1 & b_2 & b_3 \end{vmatrix}$ |
| সামান্তরিকের ক্ষেত্রফল | $\lvert\vec{a} \times \vec{b}\rvert$ |
| ত্রিভুজের ক্ষেত্রফল | $\frac{1}{2}\lvert\vec{a} \times \vec{b}\rvert$ |
| সমতলীয় শর্ত | $[\vec{a}\ \vec{b}\ \vec{c}] = 0$ |

> 🧠 **Memory Hack:** 
> * **Dot Product** = Result is **S**calar (Think: **S**ingle number).
> * **Cross Product** = Result is **V**ector (Think: **V** for Vector, V for Volume/Area).
> * **Dot** for **Projection/Work**, **Cross** for **Area/Torque**.