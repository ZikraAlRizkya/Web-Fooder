import re
import html
import string
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory

# Inisialisasi stemmer Sastrawi
factory = StemmerFactory()
stemmer = factory.create_stemmer()

def clean_text(text):
    # Pastikan input string
    text = html.unescape(str(text))

    # Hilangkan URL
    text = re.sub(r"https?://\S+|www\.\S+", " url ", text)

    # Hilangkan mention
    text = re.sub(r"@\w+", " user ", text)

    # Hilangkan hashtag simbol #
    text = text.replace("#", " ")

    # Hilangkan emoji unicode
    text = re.sub(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002700-\U000027BF"
        "\U000024C2-\U0001F251"
        "]+",
        " ",
        text,
    )

    # Hilangkan emoticon ASCII
    text = re.sub(
        r"(:\s?\)|:-\)|:\s?D|:-D|=\)|=\(|:\(|:-\(|:v|:V|XD|xD|T_T|\^\^|"
        r"--|..|:'\(|:\*|;\)|;-D)",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    # Hilangkan karakter encoding rusak
    text = re.sub(r"[ÂâðŸ€™˜¦¥±¤œ]+", " ", text)

    # Hilangkan karakter aneh selain huruf, angka, dan tanda baca penting
    text = re.sub(r"[^a-zA-Z0-9@#.,!?;:()\"' ]", " ", text)

    # Rapikan repeated punctuation
    text = re.sub(r"([!?.,])\1+", r"\1", text)

    # Rapikan whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # Lowercase
    text = text.lower()

    # Tokenisasi sederhana (split spasi)
    tokens = text.split()

    # Hilangkan stopwords sederhana (opsional, bisa pakai daftar stopwords sendiri)
    stopwords = {"url", "user"}
    tokens = [t for t in tokens if t not in stopwords]

    # Stemming dengan Sastrawi
    stemmed_tokens = [stemmer.stem(t) for t in tokens]

    # Gabungkan kembali
    return " ".join(stemmed_tokens)