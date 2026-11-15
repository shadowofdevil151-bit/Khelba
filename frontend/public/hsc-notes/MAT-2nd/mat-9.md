# 📚 HSC উচ্চতর গণিত ২য় পত্র - অধ্যায় ৯: সমতলে বস্তুকণার গতি (Motion of Particles in a Plane)

> **অধ্যায়ের সারাংশ:** বলবিদ্যার এই অধ্যায়ে সমতলে চলমান বস্তুকণার গতিবিষয়ক ধারণা (সরণ, বেগ, ত্বরণ, আপেক্ষিক বেগ) এবং নানাবিধ গাণিতিক সমস্যা সমাধানের কৌশল আলোচনা করা হয়েছে। এছাড়া মাধ্যাকর্ষণজনিত ত্বরণের অধীনে উল্লম্ব গতি এবং প্রক্ষেপক (Projectile) এর বিস্তারিত আলোচনা এখানে গোছানোভাবে দেওয়া হলো।

---

## 🎯 ১. সরণ, বেগ ও ত্বরণ (Displacement, Velocity & Acceleration)

*   **সরণ (Displacement):** নির্দিষ্ট সময়ে কোনো বস্তুর অবস্থান পরিবর্তনকে সরণ বলে। এটি একটি ভেক্টর রাশি। 
*   **বেগ (Velocity):** নির্দিষ্ট দিকে কোনো গতিশীল বস্তুর সময়ের সাপেক্ষে সরণের পরিবর্তনের হারকে বেগ বলে।

$$
\vec{v} = \frac{d\vec{s}}{dt}
$$

*   **ত্বরণ (Acceleration):** সময়ের সাপেক্ষে বেগের পরিবর্তনের হারকে ত্বরণ বলে। এটি ভেক্টর রাশি।

$$
\vec{a} = \frac{d\vec{v}}{dt} = \frac{d^2\vec{s}}{dt^2}
$$


### 🔹 একবিন্দুগামী দুইটি বেগের লব্ধি (Resultant of Two Velocities)
যদি কোনো বিন্দুতে একই সময়ে দুইটি বেগ $u$ ও $v$ পরস্পর $\alpha$ কোণে ক্রিয়া করে, তবে তাদের লব্ধি বেগ $w$ এর মান ও দিক:
*   **লব্ধি বেগ:** $w = \sqrt{u^2 + v^2 + 2uv\cos\alpha}$
*   **দিক:** $\theta = \tan^{-1}\left(\frac{v\sin\alpha}{u + v\cos\alpha}\right)$

---

## 🚣 ২. আপেক্ষিক বেগ (Relative Velocity)

যদি $P$ ও $Q$ বস্তু যথাক্রমে $V_P$ ও $V_Q$ বেগে একই সরলরেখা বরাবর বা সমান্তরাল সরলরেখা বরাবর বিপরীত দিকে গতিশীল হয়, তবে $Q$ এর সাপেক্ষে $P$ এর আপেক্ষিক বেগ $V_{PQ} = V_P - (-V_Q) = V_P + V_Q$।
যদি তারা পরস্পর $\alpha$ কোণে চলে, তবে:
*   **আপেক্ষিক বেগের মান:** $V_{PQ} = \sqrt{V_P^2 + V_Q^2 - 2V_P V_Q\cos\alpha}$
*   **নদী পারাপার (River Crossing):** স্রোতের বেগ $v$ এবং নৌকার বেগ $u$ ($u > v$) হলে, ন্যূনতম সময়ে নদী পার হতে নৌকাকে স্রোতের সাপেক্ষে লম্বভাবে চালাতে হবে।
    *   সর্বনিম্ন সময়: $t = \frac{d}{u}$ (যেখানে $d$ নদীর প্রস্থ)
    *   ভাটির দিকে সরে যাওয়া দূরত্ব: $x = v \cdot t = \frac{vd}{u}$

---

## 🧮 ৩. গতির সমীকরণ ও গড় বেগ (Equations of Motion & Average Velocity)

### 🔹 সরলরেখায় সমত্বরণে চলমান বস্তুকণার গতিসূত্র (Equations of Motion)
যদি কোনো কণা $u$ আদিবেগে এবং $f$ সমত্বরণে $t$ সময়ে $s$ দূরত্ব অতিক্রম করে $v$ বেগ প্রাপ্ত হয়:
1.  $v = u + ft$
2.  $s = ut + \frac{1}{2}ft^2$
3.  $v^2 = u^2 + 2fs$
*(মন্দনের ক্ষেত্রে $f$ এর জায়গায় $-f$ বসবে)*

*   **$t$-তম সেকেন্ডে অতিক্রান্ত দূরত্ব:**

$$
s_t = u + \frac{1}{2}f(2t - 1)
$$


*   **গড় বেগ (Average Velocity):**

$$
v_{avg} = \frac{s}{t} = \frac{u + v}{2} = u + \frac{1}{2}ft
$$


### 📈 লেখচিত্র (Graphs)
<!-- MAT-2nd-C09-I01 -->

![Two graphs. 1. Distance-time graph showing a straight line (uniform velocity) and a curve (variable velocity). 2. Velocity-time graph showing a straight line (uniform acceleration) with shaded area under the curve.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793719751/image_6edd9c26_1_sntjjz.jpg)

*   **দূরত্ব-সময় লেখচিত্র (Distance-time Graph):** লেখচিত্রের ঢাল (slope) হলো বেগ।
*   **বেগ-সময় লেখচিত্র (Velocity-time Graph):** 
    *   লেখচিত্রের ঢাল (slope) হলো ত্বরণ (Acceleration)।
    *   লেখচিত্রের নিচের ক্ষেত্রফল (Area) হলো অতিক্রান্ত দূরত্ব (Distance)।

---

## 🍎 ৪. মাধ্যাকর্ষণজনিত ত্বরণ (Acceleration due to Gravity)

যখন কোনো বস্তু অভিকর্ষের প্রভাবে শুধুমাত্র মাধ্যাকর্ষণ বলের অধীনে নিচের দিকে বা উপরের দিকে গতিশীল হয়, তখন তাকে উল্লম্ব গতি (Vertical motion) বলে। মাধ্যাকর্ষণজনিত ত্বরণ $g = 9.8 \, \text{ms}^{-2}$।

| গতির ধরন | সমীকরণ (Equations) |
| :--- | :--- |
| **উপরের দিকে নিক্ষেপ (Upward Projection)** | $v = u - gt$ <br> $h = ut - \frac{1}{2}gt^2$ <br> $v^2 = u^2 - 2gh$ |
| **নিচের দিকে নিক্ষেপ (Downward Projection)** | $v = u + gt$ <br> $h = ut + \frac{1}{2}gt^2$ <br> $v^2 = u^2 + 2gh$ |
| **অবাধ পতন (Free Fall) ($u=0$)** | $v = gt$ <br> $h = \frac{1}{2}gt^2$ <br> $v^2 = 2gh$ |

*   **সর্বোচ্চ উচ্চতা (Maximum Height):** $H = \frac{u^2}{2g}$
*   **উত্থানকাল (Time of Ascent):** $T_1 = \frac{u}{g}$
*   **পতনকাল (Time of Descent):** $T_2 = \frac{u}{g}$
*   **বিচরণকাল (Total Time of Flight):** $T = T_1 + T_2 = \frac{2u}{g}$

> 💡 **Exam Tip:** উল্লম্ব গতির অঙ্কে যদি বস্তুকে উপরের দিকে নিক্ষেপ করা হয়, তবে সর্বোচ্চ উচ্চতায় বেগ $v = 0$ হয়। আর যদি নিচের দিকে ফেলা হয়, তবে বেগ ধনাত্মক ধরে হিসাব করতে হবে।

---

## 🏹 ৫. প্রক্ষেপক (Projectile)

**সংজ্ঞা:** কোনো বস্তুকে ভূমির সাথে নির্দিষ্ট কোণে বায়ুশূন্য স্থানে নিক্ষেপ করলে শুধুমাত্র মাধ্যাকর্ষণজনিত ত্বরণের অধীনে বস্তুটি যে বক্রপথে চলে, তাকে প্রক্ষেপক বলে। আর সেই বক্রপথকে গতিপথ বা 궤চর পথ (Trajectory) বলে।

<!-- MAT-2nd-C09-I02 -->

![A parabolic trajectory of a projectile showing initial velocity u at angle \alpha, maximum height H, horizontal range R, and the coordinates (x,y) at any time t.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793719800/image_6f6fa89d_1_llfd42.jpg)

### 🔹 প্রক্ষেপকের মূল সূত্রাবলি
ধরি, $u$ বেগে ভূমির সাথে $\alpha$ কোণে বস্তুটি নিক্ষিপ্ত হয়েছে।

*   **গতিপথের সমীকরণ (Equation of Trajectory):** 
    এটি একটি পরাবৃত্ত (Parabola)।

$$
y = x\tan\alpha - \frac{gx^2}{2u^2\cos^2\alpha}
$$

$$
\Rightarrow y = x\tan\alpha \left(1 - \frac{x}{R}\right)
$$


*   **বিচরণকাল (Time of Flight):**

$$
T = \frac{2u\sin\alpha}{g}
$$


*   **সর্বোচ্চ উচ্চতা (Maximum Height):**

$$
H = \frac{u^2\sin^2\alpha}{2g}
$$


*   **আনুভূমিক পাল্লা (Horizontal Range):**

$$
R = \frac{u^2\sin 2\alpha}{g}
$$

    *   সর্বোচ্চ পাল্লা পাওয়া যায় যখন $\alpha = 45^\circ$ হয়। তখন $R_{max} = \frac{u^2}{g}$।

*   **গুরুত্বপূর্ণ সম্পর্ক (Relations):**
    *   $R = 4H\cot\alpha$
    *   $H = \frac{gT^2}{8}$
    *   $T = \frac{2H}{R} \times \cot\alpha$

> 🧠 **Memory Hack:** প্রক্ষেপকের ক্ষেত্রে 45° কোণে নিক্ষেপ করলে সর্বোচ্চ পাল্লা পাওয়া যায়। এবং যেকোনো কোণ $\alpha$ এবং $(90^\circ - \alpha)$ এর জন্য পাল্লা একই হয়।

---

## 🎁 ৬. ফর্মুলা ব্যাংক (Quick Revision Table)

| কনসেপ্ট | সূত্র / সমীকরণ |
| :--- | :--- |
| **গতির ১ম সমীকরণ** | $v = u + ft$ |
| **গতির ২য় সমীকরণ** | $s = ut + \frac{1}{2}ft^2$ |
| **গতির ৩য় সমীকরণ** | $v^2 = u^2 + 2fs$ |
| **$t$-তম সেকেন্ডের দূরত্ব** | $s_t = u + \frac{1}{2}f(2t - 1)$ |
| **আপেক্ষিক বেগ (পরস্পর $\alpha$ কোণে)** | $V_{PQ} = \sqrt{V_P^2 + V_Q^2 - 2V_P V_Q\cos\alpha}$ |
| **উল্লম্ব উত্থানের সর্বোচ্চ উচ্চতা** | $H = \frac{u^2}{2g}$ |
| **উল্লম্ব উত্থানের বিচরণকাল** | $T = \frac{2u}{g}$ |
| **প্রক্ষেপকের বিচরণকাল** | $T = \frac{2u\sin\alpha}{g}$ |
| **প্রক্ষেপকের সর্বোচ্চ উচ্চতা** | $H = \frac{u^2\sin^2\alpha}{2g}$ |
| **প্রক্ষেপকের আনুভূমিক পাল্লা** | $R = \frac{u^2\sin 2\alpha}{g}$ |
| **প্রক্ষেপকের গতিপথ** | $y = x\tan\alpha \left(1 - \frac{x}{R}\right)$ |

> 🧠 **Memory Hack:** 
> *   $v, u, f, s$ এর সম্পর্ক মনে রাখার সহজ উপায়: **"ভুপা"** (ভেলোসিটি $v$, ইউনিফর্ম ভেলোসিটি $u$, ফোর্স/অ্যাক্সিলারেশন $f$, স্পেস $s$)।
> *   প্রক্ষেপকের ক্ষেত্রে: $R = 4H\cot\alpha$। অর্থাৎ, সর্বোচ্চ উচ্চতা ও পাল্লার সম্পর্ক বোঝার জন্য এই সূত্রটি খুব কাজে লাগে।