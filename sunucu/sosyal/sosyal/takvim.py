"""Hedef kitleye göre özel gün takvimi. Sohbet başında önümüzdeki 3 hafta bağlama eklenir.
tur: 'kutlama' (içerik bağlanabilir), 'anma' (yalnız saygılı içerik), 'yayin_yok' (hiç yayın yapılmaz).
Dinî bayramlar ay takvimine göredir; tarihler yaklaşık verilir ve Diyanet takviminden doğrulanır."""
from datetime import date, timedelta


def paskalya(y):
    a, b, c = y % 19, y // 100, y % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l_ = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l_) // 451
    ay = (h + l_ - 7 * m + 114) // 31
    gun = (h + l_ - 7 * m + 114) % 31 + 1
    return date(y, ay, gun)


def nci(y, ay, hafta_gunu, n):
    """Ayın n. haftanın günü (0=pazartesi). n=-1 son."""
    if n > 0:
        d = date(y, ay, 1)
        d += timedelta(days=(hafta_gunu - d.weekday()) % 7)
        return d + timedelta(weeks=n - 1)
    son = date(y + (ay == 12), ay % 12 + 1, 1) - timedelta(days=1)
    return son - timedelta(days=(son.weekday() - hafta_gunu) % 7)


# Ramazan ve Kurban Bayramı ilk günleri (yaklaşık)
BAYRAM = {2026: (date(2026, 3, 20), date(2026, 5, 27)), 2027: (date(2027, 3, 9), date(2027, 5, 16)),
          2028: (date(2028, 2, 26), date(2028, 5, 5))}


def gunler(y):
    p = paskalya(y)
    g = {"tr": [
        (date(y, 1, 1), "Yılbaşı", "kutlama"), (date(y, 3, 18), "Çanakkale Zaferi ve Şehitleri Anma Günü", "anma"),
        (date(y, 4, 23), "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı", "kutlama"),
        (date(y, 5, 1), "Emek ve Dayanışma Günü", "kutlama"),
        (date(y, 5, 19), "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı", "kutlama"),
        (nci(y, 5, 6, 2), "Anneler Günü", "kutlama"), (nci(y, 6, 6, 3), "Babalar Günü", "kutlama"),
        (date(y, 7, 15), "15 Temmuz Demokrasi ve Millî Birlik Günü", "anma"),
        (date(y, 8, 30), "30 Ağustos Zafer Bayramı", "kutlama"), (date(y, 10, 29), "29 Ekim Cumhuriyet Bayramı", "kutlama"),
        (date(y, 11, 10), "10 Kasım Atatürk'ü Anma Günü (yayın yok)", "yayin_yok"),
        (date(y, 11, 24), "Öğretmenler Günü", "kutlama"), (date(y, 12, 31), "Yılbaşı gecesi", "kutlama")],
        "en": [
        (date(y, 1, 1), "New Year's Day", "kutlama"), (nci(y, 1, 0, 3), "Martin Luther King Jr. Day (US)", "anma"),
        (nci(y, 2, 6, 2), "Super Bowl (yaklaşık)", "kutlama"), (date(y, 2, 14), "Valentine's Day", "kutlama"),
        (nci(y, 2, 0, 3), "Presidents' Day (US)", "kutlama"), (p - timedelta(days=21), "Mothering Sunday (UK)", "kutlama"),
        (date(y, 3, 17), "St. Patrick's Day", "kutlama"), (p - timedelta(days=2), "Good Friday", "anma"),
        (p, "Easter", "kutlama"), (nci(y, 5, 6, 2), "Mother's Day (US)", "kutlama"),
        (nci(y, 5, 0, -1), "Memorial Day (US)", "anma"), (date(y, 6, 6), "D-Day yıldönümü", "anma"),
        (nci(y, 6, 6, 3), "Father's Day (US/UK)", "kutlama"), (date(y, 6, 19), "Juneteenth (US)", "anma"),
        (date(y, 7, 4), "Independence Day (US)", "kutlama"), (nci(y, 9, 0, 1), "Labor Day (US)", "kutlama"),
        (date(y, 10, 31), "Halloween", "kutlama"), (date(y, 11, 5), "Guy Fawkes Night (UK)", "kutlama"),
        (date(y, 11, 11), "Veterans Day (US) / Remembrance Day (UK)", "anma"),
        (nci(y, 11, 6, 2), "Remembrance Sunday (UK)", "anma"), (nci(y, 11, 3, 4), "Thanksgiving (US)", "kutlama"),
        (nci(y, 11, 3, 4) + timedelta(days=1), "Black Friday", "kutlama"), (date(y, 12, 25), "Christmas", "kutlama"),
        (date(y, 12, 26), "Boxing Day (UK)", "kutlama"), (date(y, 12, 31), "New Year's Eve", "kutlama")],
        "es": [
        (date(y, 1, 6), "Reyes Magos (España)", "kutlama"), (p - timedelta(days=47), "Carnaval", "kutlama"),
        (date(y, 2, 28), "Día de Andalucía", "kutlama"), (p - timedelta(days=7), "Domingo de Ramos / Semana Santa", "kutlama"),
        (p, "Pascua", "kutlama"), (date(y, 4, 23), "Sant Jordi / Día del Libro", "kutlama"),
        (date(y, 4, 30), "Día del Niño (México)", "kutlama"), (date(y, 5, 10), "Día de la Madre (México)", "kutlama"),
        (date(y, 5, 25), "Revolución de Mayo (Argentina)", "kutlama"), (date(y, 6, 23), "Noche de San Juan", "kutlama"),
        (date(y, 7, 6), "San Fermín (6–14 julio)", "kutlama"), (date(y, 7, 9), "Independencia de Argentina", "kutlama"),
        (date(y, 7, 20), "Independencia de Colombia", "kutlama"), (date(y, 7, 28), "Fiestas Patrias (Perú)", "kutlama"),
        (nci(y, 8, 2, -1), "La Tomatina (Buñol)", "kutlama"), (date(y, 9, 16), "Independencia de México", "kutlama"),
        (date(y, 9, 18), "Fiestas Patrias (Chile)", "kutlama"),
        (date(y, 10, 12), "Día de la Hispanidad / Día de la Diversidad Cultural", "kutlama"),
        (date(y, 11, 1), "Todos los Santos / Día de Muertos (1–2 nov)", "kutlama"),
        (date(y, 12, 6), "Día de la Constitución (España)", "kutlama"), (date(y, 12, 24), "Nochebuena", "kutlama"),
        (date(y, 12, 28), "Día de los Santos Inocentes (bromas)", "kutlama"), (date(y, 12, 31), "Nochevieja", "kutlama")]}
    if y in BAYRAM:
        r, k = BAYRAM[y]
        g["tr"] += [(r, "Ramazan Bayramı (yaklaşık, Diyanet'ten doğrula)", "kutlama"),
                    (k, "Kurban Bayramı (yaklaşık, Diyanet'ten doğrula)", "kutlama")]
    return g


def yaklasan(dil, bugun=None, gun=21):
    bugun = bugun or date.today()
    son = bugun + timedelta(days=gun)
    liste = [x for y in {bugun.year, son.year} for x in gunler(y).get(dil, [])]
    return sorted((d, ad, tur) for d, ad, tur in liste if bugun <= d <= son)


def metin(dil, bugun=None):
    l = yaklasan(dil, bugun)
    if not l:
        return "Önümüzdeki 3 haftada bu kitle için kayıtlı özel gün yok."
    ek = {"anma": " → yalnız saygılı içerik", "yayin_yok": " → BU GÜN YAYIN YAPILMAZ", "kutlama": ""}
    return "\n".join(f"- {d.strftime('%d.%m.%Y')} ({['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'][d.weekday()]}): {ad}{ek[t]}"
                     for d, ad, t in l)


def yayin_yok_gunleri(dil, yil):
    return [d for d, _, t in gunler(yil).get(dil, []) if t == "yayin_yok"]
