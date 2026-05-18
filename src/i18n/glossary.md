# Localization glossary (en → my)

Quality rule: natural Burmese for UI labels; avoid word-for-word dictionary tone.

## Keep in English (do not translate in UI)

| Item | Example |
|------|---------|
| Brand | Premium Lottery |
| Status chips | open, closed, drawn, active, voided |
| Raw data | Ticket IDs, 4-digit numbers, emails, formatted amounts |
| Round auto-names | Round 1, Round 2 |
| Draw button label (admin) | Draw (optional; action buttons may use Burmese) |

## Domain terms

| English | Burmese (UI) |
|---------|----------------|
| Sell tickets | လက်မှတ်ရောင်းရန် |
| Sold tickets | ရောင်းပြီး လက်မှတ်များ |
| My sales | ကျွန်ုပ်၏ ရောင်းအား |
| Draw results | ထွက်ပေါက်ရလဒ် |
| Commission | ကော်မရှင် |
| Due to admin | အက်မင်ထံ ပေးသွင်းရန် |
| Round (label) | စက်ဝန်း |
| Buyer / Customer | ဝယ်သူ |
| Lucky numbers | ဂဏန်း (context: 4-digit) |

## QA checklist

- [ ] Login: မြန်မာ default, switcher works, sign in
- [ ] Agent sell: form, confirm modal, toasts
- [ ] Agent tickets: cards (mobile), table (desktop), Reprint PDF
- [ ] Agent summary: settlement banner and stats
- [ ] Admin dashboard: round selector, settlement table
- [ ] Admin rounds: list, create, draw modals
- [ ] Verify page (public): Burmese labels, status chips still English where applicable
- [ ] PDF: field labels in Burmese when locale is my
- [ ] Dev console: no `[i18n] missing key` warnings on main flows
