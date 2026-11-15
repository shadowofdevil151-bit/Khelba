# 📚 HSC উচ্চতর গণিত ১ম পত্র - অধ্যায় ৭: সংযুক্ত কোণের ত্রিকোণমিতিক অনুপাত ও ত্রিভুজের ধর্ম (Compound Angles & Properties of Triangles)

> **অধ্যায়ের সারাংশ:** ত্রিকোণমিতির সবচেয়ে গুরুত্বপূর্ণ এবং সূত্রবহুল অধ্যায়। এখানে সংযুক্ত কোণ, গুণিতক কোণ, রূপান্তর সূত্র এবং ত্রিভুজের জ্যামিতিক সূত্রগুলো একদম পরিষ্কারভাবে সাজানো হয়েছে। 

---

## 📐 ১. মৌলিক সংযুক্ত কোণের সূত্র (Formulas of Compound Angles)

$A$ এবং $B$ যেকোনো দুইটি কোণ হলে, 
*   $\sin(A + B) = \sin A \cos B + \cos A \sin B$
*   $\sin(A - B) = \sin A \cos B - \cos A \sin B$
*   $\cos(A + B) = \cos A \cos B - \sin A \sin B$
*   $\cos(A - B) = \cos A \cos B + \sin A \sin B$

**$\tan$ এবং $\cot$ এর ক্ষেত্রে:**
*   $\tan(A + B) = \frac{\tan A + \tan B}{1 - \tan A \tan B}$
*   $\tan(A - B) = \frac{\tan A - \tan B}{1 + \tan A \tan B}$
*   $\cot(A + B) = \frac{\cot A \cot B - 1}{\cot B + \cot A}$
*   $\cot(A - B) = \frac{\cot A \cot B + 1}{\cot B - \cot A}$

> 💡 **Exam Tip:** $\sin$ এর সূত্রে প্রথমে $\sin \cos$, পরে $\cos \sin$ এবং চিহ্ন অপরিবর্তিত থাকে। $\cos$ এর সূত্রে প্রথমে $\cos \cos$, পরে $\sin \sin$ এবং চিহ্ন পরিবর্তিত ($\pm$ হলে $\mp$) হয়।

---

## 🔄 ২. গুণফল থেকে যোগফল ও যোগফল থেকে গুণফল (Transformation Formulas)

### 🔹 যোগফল ➡️ গুণফল (Sum to Product)
*   $\sin C + \sin D = 2 \sin\frac{C+D}{2} \cos\frac{C-D}{2}$
*   $\sin C - \sin D = 2 \cos\frac{C+D}{2} \sin\frac{C-D}{2}$
*   $\cos C + \cos D = 2 \cos\frac{C+D}{2} \cos\frac{C-D}{2}$
*   $\cos C - \cos D = 2 \sin\frac{C+D}{2} \sin\frac{D-C}{2}$  *(খেয়াল রাখতে হবে: $D-C$ হবে)*

### 🔹 গুণফল ➡️ যোগফল (Product to Sum)
*   $2 \sin A \cos B = \sin(A + B) + \sin(A - B)$
*   $2 \cos A \sin B = \sin(A + B) - \sin(A - B)$
*   $2 \cos A \cos B = \cos(A + B) + \cos(A - B)$
*   $2 \sin A \sin B = \cos(A - B) - \cos(A + B)$

---

## 🧬 ৩. গুণিতক ও উপ-গুণিতক কোণ (Multiple & Sub-multiple Angles)

### 🔹 দ্বিগুণ কোণ (Double Angle - $2A$)
*   $\sin 2A = 2 \sin A \cos A = \frac{2 \tan A}{1 + \tan^2 A}$
*   $\cos 2A = \cos^2 A - \sin^2 A = 1 - 2\sin^2 A = 2\cos^2 A - 1 = \frac{1 - \tan^2 A}{1 + \tan^2 A}$
*   $\tan 2A = \frac{2 \tan A}{1 - \tan^2 A}$

### 🔹 ত্রিগুণ কোণ (Triple Angle - $3A$)
*   $\sin 3A = 3 \sin A - 4 \sin^3 A$
*   $\cos 3A = 4 \cos^3 A - 3 \cos A$
*   $\tan 3A = \frac{3 \tan A - \tan^3 A}{1 - 3 \tan^2 A}$

### 🔹 উপ-গুণিতক কোণ (Sub-multiple Angles - $A/2$)
*   $\sin A = 2 \sin\frac{A}{2} \cos\frac{A}{2}$
*   $\cos A = \cos^2\frac{A}{2} - \sin^2\frac{A}{2} = 1 - 2\sin^2\frac{A}{2} = 2\cos^2\frac{A}{2} - 1$
*   $\tan A = \frac{2 \tan(A/2)}{1 - \tan^2(A/2)}$

> 💡 **Exam Tip:** $\tan(A/2)$ এর সূত্র খুব বেশি ব্যবহৃত হয়: $\tan\frac{A}{2} = \frac{\sin A}{1 + \cos A} = \frac{1 - \cos A}{\sin A} = \pm\sqrt{\frac{1 - \cos A}{1 + \cos A}}$

---

## 🔺 ৪. ত্রিভুজের ধর্ম (Properties of Triangles)

$ABC$ ত্রিভুজের তিনটি বাহু $a, b, c$ এবং তিনটি কোণ $A, B, C$। 

<!-- MAT-1st-C07-I01 -->

![A triangle ABC with sides labeled a, b, c opposite to angles A, B, C respectively. Also show the circumcircle with radius R.](https://res.cloudinary.com/de4qffsit/image/upload/f_auto,q_auto,w_800/v1793718047/image_88ead28c_1_mor8dq.jpg)

### 🔹 সাইন সূত্র (Sine Rule)

$$
\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C} = 2R
$$

*(যেখানে $R$ হলো ত্রিভুজের পরিবৃত্তের ব্যাসার্ধ বা Circumradius)*
*   **রূপান্তর:** $a = 2R \sin A$, $b = 2R \sin B$, $c = 2R \sin C$

### 🔹 কোসাইন সূত্র (Cosine Rule)

$$
\cos A = \frac{b^2 + c^2 - a^2}{2bc}
$$

$$
\cos B = \frac{c^2 + a^2 - b^2}{2ca}
$$

$$
\cos C = \frac{a^2 + b^2 - c^2}{2ab}
$$

*   **রূপান্তর:** $a^2 = b^2 + c^2 - 2bc \cos A$

### 🔹 প্রক্ষেপণ সূত্র (Projection Rule)
*   $a = b \cos C + c \cos B$
*   $b = c \cos A + a \cos C$
*   $c = a \cos B + b \cos A$

### 🔹 ট্যানজেন্ট সূত্র / নেপিয়ারের সাদৃশ্য (Tangent Rule / Napier's Analogy)

$$
\tan\left(\frac{B-C}{2}\right) = \frac{b-c}{b+c} \cot\frac{A}{2}
$$

*(একইভাবে $A$ ও $C$ এর জন্যও সূত্র তৈরি করা যায়)*

### 🔹 অর্ধকোণ নির্ণয়ের সূত্র (Half-Angle Formulas)

$$
\sin\frac{A}{2} = \sqrt{\frac{(s-b)(s-c)}{bc}}
$$

$$
\cos\frac{A}{2} = \sqrt{\frac{s(s-a)}{bc}}
$$

$$
\tan\frac{A}{2} = \sqrt{\frac{(s-b)(s-c)}{s(s-a)}} = \frac{\Delta}{s(s-a)}
$$

*(যেখানে $2s = a+b+c$ হলো ত্রিভুজের পরিসীমা)*

---

## 📏 ৫. ত্রিভুজের ক্ষেত্রফল (Area of Triangle)

$ABC$ ত্রিভুজের ক্ষেত্রফল $\Delta$ হলে:

| সূত্রের নাম | গাণিতিক রূপ (LaTeX) |
| :--- | :--- |
| **সাধারণ সূত্র** | $\Delta = \frac{1}{2}bc \sin A = \frac{1}{2}ca \sin B = \frac{1}{2}ab \sin C$ |
| **হেরনের সূত্র (Heron's Formula)** | $\Delta = \sqrt{s(s-a)(s-b)(s-c)}$ |
| **পরিবৃত্তের ব্যাসার্ধের সাহায্যে** | $\Delta = \frac{abc}{4R}$ |
| **অন্তবৃত্তের ব্যাসার্ধের সাহায্যে** | $\Delta = rs$ |

> 💡 **Exam Tip:** $R$ (Circumradius) এবং $r$ (Inradius) এর মধ্যে সম্পর্ক: $r = 4R \sin\frac{A}{2} \sin\frac{B}{2} \sin\frac{C}{2}$

---

## 🧩 ৬. শর্তাধীন অভেদ (Conditional Identities - $A+B+C=\pi$)

যদি ত্রিভুজের তিনটি কোণের যোগফল $180^\circ$ বা $\pi$ রেডিয়ান হয় (অর্থাৎ $A+B+C = \pi$), তবে নিচের অভেদগুলো প্রযোজ্য:

*   $\sin(A+B) = \sin C$
*   $\cos(A+B) = -\cos C$
*   $\tan(A+B) = -\tan C$
*   $\sin^2 A + \sin^2 B + \sin^2 C = 2 + 2\cos A \cos B \cos C$
*   $\cos^2 A + \cos^2 B + \cos^2 C = 1 - 2\cos A \cos B \cos C$
*   $\tan A + \tan B + \tan C = \tan A \tan B \tan C$
*   $\cot A \cot B + \cot B \cot C + \cot C \cot A = 1$

---

## 🎁 ৭. ফর্মুলা ব্যাংক (Quick Revision Table)

| কনসেপ্ট | সূত্র |
| :--- | :--- |
| $\sin(A \pm B)$ | $\sin A \cos B \pm \cos A \sin B$ |
| $\cos(A \pm B)$ | $\cos A \cos B \mp \sin A \sin B$ |
| $\sin 2A$ | $2 \sin A \cos A$ |
| $\cos 2A$ | $1 - 2\sin^2 A$ |
| $\tan 2A$ | $\frac{2\tan A}{1-\tan^2 A}$ |
| সাইন সূত্র | $\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C} = 2R$ |
| কোসাইন সূত্র | $\cos A = \frac{b^2+c^2-a^2}{2bc}$ |
| ত্রিভুজের ক্ষেত্রফল (R) | $\Delta = \frac{abc}{4R}$ |
| অর্ধকোণ $\tan(A/2)$ | $\sqrt{\frac{(s-b)(s-c)}{s(s-a)}}$ |
| শর্তাধীন (Sum) | $\tan A + \tan B + \tan C = \tan A \tan B \tan C$ |

> 🧠 **Memory Hack:** 
> * সাইন সূত্র: বাহু/সাইন = $2R$।
> * কোসাইন সূত্র: "বর্গের সমষ্টি - বিপরীত বাহুর বর্গ" ÷ $2 \times$ সন্নিহিত বাহুদ্বয়ের গুণফল।
> * $A+B+C=\pi$ হলে $\tan$ এর ক্ষেত্রে যোগফল = গুণফল।
> * $\cos 2A$ এর তিনটি রূপ মুখস্থ রাখতে হবে: $\cos^2A - \sin^2A$, $2\cos^2A - 1$, $1 - 2\sin^2A$।