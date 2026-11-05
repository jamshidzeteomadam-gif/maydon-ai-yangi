# AI Maydon — O'zbekcha modelni o'qitish (eksperimental)

Bu GitHub tarmog'i `main` saytga tegmaydi. Bu yerda o'quv dataset va GPU LoRA training kodi bor.
Asos model: [Qwen/Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B).
**Kod yuklanganligi model allaqachon o'qitilganini anglatmaydi.**

## GPU bilan ishga tushirish (Colab)
1. Colab > Runtime > Change runtime type > GPU.
2. Colab Python katagiga:
```python
!git clone --branch feature/uzbek-ai-training-v01 https://github.com/jamshidzeteomadam-gif/maydon-ai-yangi.git
%cd maydon-ai-yangi
!pip install -q -r training/requirements.txt
!python training/train_lora.py --epochs 2
```
3. Tayyor adapter `training/out/qwen3-uz-lora` papkasida bo'ladi. Model inference uchun alohida GPU-server talab qilinadi.

## Ish holati
- Dataset: 68 ta original o'zbekcha suhbat namunasi, hajmi sinov uchun kichik.
- Sheva template: 12 viloyat; barcha joylar ataylab bo'sh. Mahalliy sheva namunalari tekshirilmaguncha to'ldirilmaydi.
- Kitoblar: mualliflik huquqi tekshirilmagan kitoblar qo'shilmagan.
- Asosiy sayt Netlify oldingidek ishlaydi; bu branch deploy qilinmagan.
- ChatGPT suhbatidagi to'liq ZIP to'plamida qo'shimcha test, intent router va Colab notebook bor.
