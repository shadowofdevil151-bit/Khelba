# 📚 HSC উচ্চতর গণিত ২য় পত্র - অধ্যায় ১: বাস্তব সংখ্যা ও অসমতা (Real Numbers & Inequalities)

> **অধ্যায়ের সারাংশ:** এই অধ্যায়টি গণিতের ভিত্তি। সংখ্যার শ্রেণীবিভাগ, বাস্তব সংখ্যার স্বীকার্য, পরম মান এবং অসমতা সমাধানের কৌশলগুলো এখানে অত্যন্ত গোছানোভাবে দেওয়া হলো। 

---

## 🔢 ১. বাস্তব সংখ্যা (Real Numbers) ও এর উপসেট

**বাস্তব সংখ্যা (Real Number):** সংখ্যারেখার প্রতিটি বিন্দুর সাথে এক-এক মিল আছে এমন সব সংখ্যাকে বাস্তব সংখ্যা বলে। বাস্তব সংখ্যার সেটকে $\mathbb{R}$ দ্বারা প্রকাশ করা হয়।

### 🔹 সংখ্যার শ্রেণীবিভাগ (Classification of Numbers)
| সংখ্যার ধরন | প্রতীক | সংজ্ঞা ও বৈশিষ্ট্য | উদাহরণ |
| :--- | :--- | :--- | :--- |
| **স্বাভাবিক সংখ্যা (Natural)** | $\mathbb{N}$ | ধনাত্মক পূর্ণসংখ্যা। | $1, 2, 3, 4, ...$ |
| **পূর্ণসংখ্যা (Integer)** | $\mathbb{Z}$ | ঋণাত্মক, শূন্য এবং ধনাত্মক পূর্ণসংখ্যা। | $..., -2, -1, 0, 1, 2, ...$ |
| **মূলদ সংখ্যা (Rational)** | $\mathbb{Q}$ | $p/q$ আকারে প্রকাশযোগ্য (যেখানে $p, q \in \mathbb{Z}, q \neq 0$)। | $3, -2, \frac{3}{5}, 0.25, 0.\overline{3}$ |
| **অমূলদ সংখ্যা (Irrational)** | $\mathbb{Q}'$ | $p/q$ আকারে প্রকাশ করা যায় না। দশমিক বিস্তৃতি অসীম ও অনাবৃত্ত। | $\sqrt{2}, \sqrt{3}, \pi, e$ |

> 💡 **Exam Tip:** $\mathbb{N} \subset \mathbb{Z} \subset \mathbb{Q} \subset \mathbb{R}$ এবং $\mathbb{Q} \cup \mathbb{Q}' = \mathbb{R}$।

<!-- MAT-2nd-C01-I01 -->

![A Venn diagram showing the hierarchy of number sets: Natural (N) inside Integer (Z) inside Rational (Q) inside Real (R), with Irrational (Q') alongside Q.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718775/image_67a679ab_1_pyzvge.jpg)

---

## ⚖️ ২. বাস্তব সংখ্যার স্বীকার্য (Axioms of Real Numbers)

$a, b, c \in \mathbb{R}$ হলে:
1.  **আবদ্ধতা (Closure):** $a+b \in \mathbb{R}$, $a-b \in \mathbb{R}$, $ab \in \mathbb{R}$ এবং $a/b \in \mathbb{R}$ (যদি $b \neq 0$)।
2.  **বিনিময়যোগ্যতা (Commutativity):** $a+b = b+a$ এবং $ab = ba$
3.  **সংযোজনযোগ্যতা (Associativity):** $(a+b)+c = a+(b+c)$ এবং $(ab)c = a(bc)$
4.  **বণ্টনযোগ্যতা (Distributivity):** $a(b+c) = ab + ac$
5.  **অভেদকের অস্তিত্ব (Identity):** যোগের অভেদক $0$ (কারণ $a+0=a$) এবং গুণের অভেদক $1$ (কারণ $a \cdot 1=a$)।
6.  **বিপরীতকের অস্তিত্ব (Inverse):** যোগের বিপরীতক $-a$ (কারণ $a+(-a)=0$) এবং গুণের বিপরীতক $a^{-1}$ বা $1/a$ (কারণ $a \cdot a^{-1}=1$); শর্ত: $a \neq 0$।

---

## 📏 ৩. ব্যবধি, ঊর্ধ্বসীমা ও নিম্নসীমা (Intervals, Supremum & Infimum)

### 🔹 ব্যবধি (Intervals)
দুইটি বাস্তব সংখ্যার মধ্যবর্তী সব সংখ্যার সেটকে ব্যবধি বলে।
*   **খোলা ব্যবধি (Open Interval):** $(a, b) = \{x \in \mathbb{R} : a < x < b\}$ (প্রান্তবিন্দু অন্তর্ভুক্ত নয়)
*   **বদ্ধ ব্যবধি (Closed Interval):** $[a, b] = \{x \in \mathbb{R} : a \le x \le b\}$ (প্রান্তবিন্দু অন্তর্ভুক্ত)
*   **অর্ধ-খোলা ব্যবধি:** $[a, b) = \{x \in \mathbb{R} : a \le x < b\}$

<!-- MAT-2nd-C01-I02 -->

![Number line showing different intervals like (a,b), \[a,b\], \[a,b), (a,∞), (-∞,b\] with open and closed circles.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718808/image_f309a12f_1_mapqqr.jpg)

### 🔹 ঊর্ধ্বসীমা ও নিম্নসীমা
*   **ঊর্ধ্বসীমা (Upper Bound):** কোনো সেটের সব উপাদান যে সংখ্যার চেয়ে ছোট বা সমান, সেই সংখ্যা।
*   **ক্ষুদ্রতম ঊর্ধ্বসীমা (Supremum - Sup):** ঊর্ধ্বসীমাগুলোর মধ্যে ক্ষুদ্রতমটি।
*   **নিম্নসীমা (Lower Bound):** কোনো সেটের সব উপাদান যে সংখ্যার চেয়ে বড় বা সমান, সেই সংখ্যা।
*   **বৃহত্তম নিম্নসীমা (Infimum - Inf):** নিম্নসীমাগুলোর মধ্যে বৃহত্তমটি।

> 💡 **Exam Tip:** $\text{Sup } S$ এবং $\text{Inf } S$ সেটের ভেতরে বা বাইরে যেকোনো একটি হতে পারে। তবে **সম্পূর্ণতা ধর্ম (Completeness Property)** অনুযায়ী, বাস্তব সংখ্যার যেকোনো অশূন্য ঊর্ধ্বসীমিত সেটের একটি Supremum থাকবে এবং নিম্নসীমিত সেটের একটি Infimum থাকবে।

---

## 🎯 ৪. পরম মান (Absolute Value)

**সংজ্ঞা:** $|x|$ হলো মূলবিন্দু থেকে $x$ বিন্দুর দূরত্ব।

$$
 |x| = \begin{cases} x, & \text{যখন } x \ge 0 \\ -x, & \text{যখন } x < 0 \end{cases} 
$$

### 🔹 পরম মানের ধর্মাবলি (Properties)
1.  $|x| \ge x$ এবং $|x| \ge -x$
2.  $|x|^2 = x^2$
3.  $|ab| = |a||b|$
4.  **ত্রিভুজ অসমতা (Triangle Inequality):** $|a+b| \le |a| + |b|$
5.  **বিপরীত অসমতা:** $|a-b| \ge |a| - |b|$
6.  $|x| < \alpha \iff -\alpha < x < \alpha$ (যেখানে $\alpha > 0$)
7.  $|x| > \alpha \iff x > \alpha$ অথবা $x < -\alpha$ (যেখানে $\alpha > 0$)

---

## 🛠️ ৫. অসমতা সমাধান (Solving Inequalities)

### 🔹 এক চলকবিশিষ্ট দ্বিঘাত অসমতা (Quadratic Inequalities)
যদি $(x-a)(x-b) < 0$ হয় (যেখানে $a > b$), তবে সমাধান হবে: $b < x < a$।
যদি $(x-a)(x-b) > 0$ হয়, তবে সমাধান হবে: $x < b$ অথবা $x > a$।
*   **সংখ্যারেখার পদ্ধতি (Sign Scheme Method):** ক্রান্তিবিন্দুগুলো (যেখানে রাশিটি শূন্য হয়) সংখ্যারেখায় বসিয়ে চিহ্ন পরীক্ষা করতে হয়।

<!-- MAT-2nd-C01-I03 -->

![A number line showing critical points and the '+' or '-' signs in different intervals to solve a quadratic inequality.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718852/image_723decbc_1_uzji9q.jpg)

### 🔹 পরম মান যুক্ত অসমতা (Absolute Value Inequalities)
$|x - a| < b \implies a - b < x < a + b$
$|x - a| > b \implies x < a - b$ অথবা $x > a + b$

### 🔹 দুই চলকবিশিষ্ট অসমতার লেখচিত্র (Graphical Inequalities)
১. প্রথমে অসমতাকে সমীকরণে রূপান্তর করে রেখা আঁকতে হবে (সমান চিহ্ন থাকলে ভরা রেখা, না থাকলে হালকা রেখা)।
২. মূলবিন্দু $(0,0)$ অথবা যেকোনো পরীক্ষা বিন্দু বসিয়ে অসমতাটি সত্য হয় কিনা দেখতে হবে।
৩. যে পার্শ্বে সত্য হয়, সেই পার্শ্বকে ছায়া দিয়ে চিহ্নিত করতে হবে।

<!-- MAT-2nd-C01-I04 -->

![A graph showing the solution region for a system of two-variable inequalities, e.g., x+y <= 6 and x+2y <= 10, with shaded overlapping area.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793719388/image_f3309246_1_bf7zbt.jpg)

---

## 🎁 ৬. ফর্মুলা ব্যাংক (Quick Revision Table)

| কনসেপ্ট | সূত্র / শর্ত |
| :--- | :--- |
| মূলদ সংখ্যার সেট | $\mathbb{Q} = \{\frac{p}{q} : p, q \in \mathbb{Z}, q \neq 0\}$ |
| পরম মানের সংজ্ঞা | $\lvert x\rvert = x$ ($x \ge 0$), $-x$ ($x < 0$) |
| ত্রিভুজ অসমতা | $\lvert a+b\rvert \le \lvert a\rvert + \lvert b\rvert$ |
| পরম মানের অসমতা | $\lvert x\rvert < a \iff -a < x < a$ |
| দ্বিঘাত অসমতা | $(x-a)(x-b) < 0 \implies x \in (b, a)$ (যখন $a>b$) |
| ব্যবধি | $(a,b)$ খোলা, $[a,b]$ বদ্ধ |

> 🧠 **Memory Hack:** 
> * অমূলদ সংখ্যা = $p/q$ আকারে লেখা যায় না। (Irrational)
> * পরম মান সবসময় ধনাত্মক বা শূন্য হয়। $|x| \ge 0$।
> * দ্বিঘাত অসমতায় $(\text{চলক} - \text{বড় মূল}) \times (\text{চলক} - \text{ছোট মূল}) < 0$ হলে, মান বসে **ছোট থেকে বড়** এর মাঝে।
> * ত্রিভুজ অসমতায় "যোগ করলে বড় হয় না, ছোট বা সমান হয়" ($|a+b| \le |a|+|b|$)।