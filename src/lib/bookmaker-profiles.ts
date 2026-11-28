/**
 * Sourced profile data for each bookmaker in `bookmaker-directory.ts`: payment methods, popularity in South Africa
 * and data-quality flags. Researched 28 November 2026.
 *
 * Rules: every value carries a source. Where no credible source was found the field is left empty and the UI says
 * "Not yet verified" — never fill a gap with a guess. Third-party sources (Betline, BetExpert, Champsbase) are
 * independent review sites that check payment cashiers from verified accounts; operator pages are preferred where
 * we could read them. Refresh before promoting any listing.
 */

export interface SourceRef {
  label: string;
  url: string;
  /** When the source was checked, as the source states it, or when Puntr read it (ISO date). */
  checked: string;
}

export interface BookmakerPayments {
  deposits: string[];
  /** Empty means we could not verify withdrawal methods. */
  withdrawals: string[];
  /** True when the source shows only part of the list. */
  partial?: boolean;
  /** True when no operator or hands-on source confirmed the list. */
  unverified?: boolean;
  note?: string;
  sources: SourceRef[];
}

export interface BookmakerPopularity {
  /** Position among South Africa's most visited gambling websites. */
  rank: number;
  /** Estimated monthly visits from South Africa, as published. */
  visits: string;
  domain: string;
}

export interface ExternalRating {
  label: string;
  score: number;
  outOf: number;
  count: string;
  source: SourceRef;
}

export interface BookmakerProfile {
  payments?: BookmakerPayments;
  popularity?: BookmakerPopularity;
  externalRatings?: ExternalRating[];
  /** Other licences the operator publishes (beyond the NGB register entry shown in the directory). */
  otherLicences?: { text: string; source: SourceRef }[];
  /** Data-quality flags, e.g. a licence number on the operator's site that differs from the NGB snapshot. */
  flags?: { text: string; source: SourceRef }[];
}

/** Semrush "Most Visited Gambling Websites in South Africa", October 2026 (top 20 published). */
export const POPULARITY_SOURCE: SourceRef = {
  label: "Semrush Top Gambling Websites in South Africa, October 2026",
  url: "https://www.semrush.com/trending-websites/za/gambling",
  checked: "2026-11-28",
};

const betline = (slug: string, checked: string): SourceRef => ({
  label: "Betline.co.za review (independent, checks NGB and CIPC records)",
  url: `https://betline.co.za/compare-betting-sites/${slug}/`,
  checked,
});

const LICENSEDBETS: SourceRef = {
  label: "LicensedBets licence register (operator footer vs NGB register)",
  url: "https://licensedbets.co.za/licence-register",
  checked: "2026-09-07",
};

/** Only the payment rails South Africans recognise; card brands collapsed to "Visa / Mastercard". */
export const bookmakerProfiles: Record<string, BookmakerProfile> = {
  "10bet": {
    popularity: { rank: 19, visits: "1.44M", domain: "10bet.co.za" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "WalletDoc",
        "EasyPay Voucher",
        "Apple Pay",
        "Google Pay",
        "Masterpass",
        "Crypto",
      ],
      withdrawals: ["EFT (after FICA)"],
      partial: true,
      sources: [betline("10bet", "2026-10-05")],
    },
  },
  "apex-bets": {
    payments: {
      deposits: ["Credit or debit card", "EFT", "Payment vouchers", "Direct bank transfer"],
      withdrawals: [],
      note: "Deposit categories from the operator's terms; specific providers are listed only after sign-in.",
      sources: [
        {
          label: "Apex Bets terms and conditions",
          url: "https://www.apexbets.co.za/terms",
          checked: "2026-11-28",
        },
      ],
    },
  },
  "bet-co-za": {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "Absa Pay",
        "BluVoucher",
        "EasyPay Voucher",
      ],
      withdrawals: ["EFT"],
      sources: [betline("betcoza", "2026-08-09")],
    },
  },
  betjets: {
    payments: {
      deposits: [
        "EFT",
        "1Voucher",
        "BluVoucher",
        "Bank card",
        "OTT Voucher",
        "EasyPay",
        "Shop2Shop",
      ],
      withdrawals: [
        "BetJets Instant Pay (Walletdoc)",
        "EFT Secure (Callpay)",
        "OTT FNB",
        "OTT Standard Bank",
      ],
      sources: [betline("betjets", "2026-10-27")],
    },
  },
  betway: {
    popularity: { rank: 1, visits: "56.88M", domain: "betway.co.za" },
    payments: {
      deposits: [
        "Visa / Mastercard",
        "Ozow",
        "OTT Voucher",
        "Kazang",
        "Quick EFT",
        "1ForYou Voucher",
        "FNB ATM (cardless)",
        "FNB, Absa, Standard Bank and Nedbank EFT",
        "USSD",
        "Shoprite / Checkers Money Market",
        "Easy Load",
        "MTN MoMo",
      ],
      withdrawals: [
        "EFT to your own bank account",
        "FNB eWallet",
        "Absa CashSend",
        "Standard Bank Instant Money",
        "1ForYou Voucher",
        "Nedbank Send-iMali",
      ],
      sources: [
        {
          label: "Betway Pedia: deposit methods",
          url: "https://www.betway.co.za/betway-pedia/documents/betway-banking/chapter/deposit-methods-available-at-betway",
          checked: "2026-11-28",
        },
        {
          label: "Betway Pedia: withdrawal methods",
          url: "https://www.betway.co.za/betway-pedia/documents/betway-banking/chapter/withdrawal-methods-available-at-betway",
          checked: "2026-11-28",
        },
      ],
    },
    otherLicences: [
      {
        text: "Eastern Dawn Sports (Pty) Ltd, Mpumalanga Economic Regulator bookmaker licence 9-2-1-09658",
        source: {
          label: "Betway site footer",
          url: "https://www.betway.co.za/betway-pedia/documents/betway-banking/chapter/withdrawal-methods-available-at-betway",
          checked: "2026-11-28",
        },
      },
    ],
    flags: [
      {
        text: "Betway's footer shows Western Cape licence 10181496-011; the NGB register snapshot shows 10181496-012.",
        source: {
          label: "Betway site footer",
          url: "https://www.betway.co.za/betway-pedia/documents/betway-banking/chapter/withdrawal-methods-available-at-betway",
          checked: "2026-11-28",
        },
      },
    ],
  },
  betxchange: {
    popularity: { rank: 8, visits: "3.93M", domain: "betxchange.com" },
    payments: {
      deposits: [],
      withdrawals: ["EFT"],
      sources: [betline("betxchange", "2026-07-13")],
    },
    otherLicences: [
      {
        text: "Eastern Cape Gambling Board licence ECBM 041 (as listed by Betline)",
        source: betline("betxchange", "2026-07-13"),
      },
    ],
  },
  "boss-bets": {
    payments: {
      deposits: ["Direct deposit to Boss Bets' FNB account", "EFT", "Credit card", "Cash deposit"],
      withdrawals: [],
      sources: [
        {
          label: "Boss Bets terms and conditions",
          url: "https://bossbets.co.za/terms-and-conditions",
          checked: "2026-11-28",
        },
      ],
    },
    flags: [
      {
        text: "Boss Bets' site footer shows bookmaker licence 10184991; the NGB register snapshot shows 10179821-013.",
        source: {
          label: "Boss Bets site footer",
          url: "https://bossbets.co.za/",
          checked: "2026-11-28",
        },
      },
    ],
  },
  bravobet: {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "1Voucher",
        "OTT Voucher",
        "Kazang",
        "BluVoucher",
        "SnapScan",
      ],
      withdrawals: ["To your registered payment method (up to R1,000)", "EFT (above R1,000)"],
      sources: [betline("bravobet", "2026-07-13")],
    },
  },
  betshezi: {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "PayGate",
        "Peach Payments",
        "OTT Voucher",
        "1Voucher",
        "EasyLoad",
        "BluVoucher",
        "EasyPay Voucher",
        "Apple Pay",
        "Masterpass",
        "Crypto",
        "Airtime",
      ],
      withdrawals: ["EFT (after FICA)"],
      sources: [betline("betshezi", "2026-09-28")],
    },
  },
  betolimp: {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "Absa Pay",
        "EFT",
        "Visa / Mastercard",
        "Peach Payments",
        "1Voucher",
        "OTT Voucher",
        "Crypto",
      ],
      withdrawals: ["EFT (after FICA)"],
      sources: [betline("betolimp", "2026-08-09")],
    },
  },
  easybet: {
    popularity: { rank: 4, visits: "7.07M", domain: "easybet.co.za" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "Visa / Mastercard",
        "Apple Pay",
        "Samsung Pay",
        "Zapper",
        "SnapScan",
        "OTT Voucher",
        "4All Voucher",
        "BluVoucher",
        "1Voucher",
        "Easyload",
      ],
      withdrawals: [
        "Ozow Instant EFT",
        "Shoprite Money Market",
        "FNB eWallet",
        "Nedbank cardless",
        "OTT Voucher",
        "Standard Bank Instant Money",
        "Absa CashSend",
        "1Voucher",
        "Airtime (Vodacom, MTN, Telkom)",
      ],
      note: "Your first withdrawal goes to your bank account.",
      sources: [betline("easybet", "2026-09-03")],
    },
    externalRatings: [
      {
        label: "Apple App Store (South Africa)",
        score: 4.3,
        outOf: 5,
        count: "2.2k ratings",
        source: {
          label: "Easybet on the App Store",
          url: "https://apps.apple.com/za/app/easybet-sports-betting/id6463143730",
          checked: "2026-11-28",
        },
      },
    ],
    otherLicences: [
      {
        text: "Easybet Group EC (Pty) Ltd, Eastern Cape Gambling Board licence ECBM 029",
        source: {
          label: "Easybet site footer",
          url: "https://easybet.co.za/",
          checked: "2026-11-28",
        },
      },
    ],
  },
  fanbets: {
    payments: {
      deposits: [
        "Capitec Pay",
        "1Voucher",
        "OTT Voucher",
        "EasyPay",
        "MTN MoMo",
        "Visa / Mastercard",
        "SiD EFT",
        "Zapper",
      ],
      withdrawals: [],
      note: "Methods shown in the site footer; withdrawal methods were not confirmed.",
      sources: [
        {
          label: "BetExpert.co.za Fanbets profile",
          url: "https://betexpert.co.za/bookmaker/fanbets-review",
          checked: "2026-10-14",
        },
      ],
    },
    flags: [
      {
        text: "Fanbets' site shows licence 10191420; the NGB register lists 10191420-004.",
        source: {
          label: "BetExpert.co.za Fanbets profile",
          url: "https://betexpert.co.za/bookmaker/fanbets-review",
          checked: "2026-10-14",
        },
      },
    ],
  },
  "g-bets": {
    popularity: { rank: 20, visits: "1.4M", domain: "gbets.co.za" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "PayGate",
        "WalletDoc",
        "1Voucher",
        "EasyLoad",
        "BluVoucher",
        "EasyPay Voucher",
        "Apple Pay",
      ],
      withdrawals: ["Bank transfer (after FICA)"],
      sources: [betline("gbets", "2026-07-13")],
    },
  },
  gameland: {},
  "gv-bet": {
    payments: {
      deposits: ["Visa", "1Voucher", "Ozow", "OTT Voucher", "Peach Payments"],
      withdrawals: [],
      sources: [{ label: "GV Bet website", url: "https://gvbet.co.za/", checked: "2026-11-28" }],
    },
  },
  hollywoodbets: {
    popularity: { rank: 2, visits: "42.34M", domain: "hollywoodbets.net" },
    payments: {
      deposits: [
        "OwnPay",
        "Stitch",
        "PayFast",
        "Walletdoc",
        "Ozow",
        "Peach Payments (card and Instant EFT)",
        "SID EFT",
        "Direct EFT",
        "ABSA Pay",
        "FNB Direct",
        "Capitec via Pay@",
        "Zapper",
        "Apple Pay",
        "Google Pay",
        "Samsung Pay",
        "MTN MoMo",
        "Flash Pay",
        "Shoprite Money Market",
        "Spot Money",
        "Nedbank Top Up Voucher",
        "1Voucher",
        "Pay with Crypto (Binance, Luno, VALR)",
      ],
      withdrawals: [
        "EFT to any South African bank account",
        "Standard Bank Instant Money",
        "FNB eWallet",
        "ABSA CashSend",
        "Nedbank Send-iMali / MobiMoney",
        "Cash at Hollywoodbets branches (up to R5,000)",
      ],
      sources: [
        {
          label: "Hollywoodbets: how to make a deposit",
          url: "https://www.hollywoodbets.net/content/info-help?contentName=how-to-make-a-deposit",
          checked: "2026-11-24",
        },
        {
          label: "Hollywoodbets Cash Send terms",
          url: "https://www.hollywoodbets.net/content/info-help?contentName=cash-send-terms-and-conditions",
          checked: "2026-11-28",
        },
        {
          label: "Hollywoodbets general terms (withdrawals)",
          url: "https://www.hollywoodbets.net/content/info-help/terms-and-conditions?contentName=general-terms-and-conditions",
          checked: "2026-11-28",
        },
      ],
    },
  },
  interbet: {
    payments: {
      deposits: [
        "EFT",
        "Visa / Mastercard",
        "Ozow",
        "Ozow Capitec",
        "OTT Voucher",
        "1ForYou Voucher",
        "Crypto",
      ],
      withdrawals: ["Bank transfer (minimum R100)"],
      sources: [betline("interbet", "2026-08-14")],
    },
  },
  "jabula-bets": {
    popularity: { rank: 12, visits: "2.38M", domain: "jabulabets.co.za" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "OTT Voucher",
        "1Voucher",
        "EasyLoad",
        "BluVoucher",
        "EasyPay Voucher",
        "Apple Pay",
      ],
      withdrawals: [],
      sources: [betline("jabulabets", "2026-07-28")],
    },
    flags: [
      {
        text: "Jabula Bets' site footer shows licence 10190512; the NGB register snapshot shows 10190511-005.",
        source: LICENSEDBETS,
      },
    ],
  },
  "king-bets": {
    payments: {
      deposits: ["Ozow", "Capitec Pay", "EFT", "Visa / Mastercard", "Peach Payments", "1Voucher"],
      withdrawals: [],
      partial: true,
      sources: [betline("kingbets", "2026-08-09")],
    },
  },
  lottoland: {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "1Voucher",
        "Zapper",
        "SnapScan",
      ],
      withdrawals: [],
      sources: [betline("lottoland", "2026-08-09")],
    },
  },
  lulabets: {
    payments: {
      deposits: ["Ozow", "Capitec Pay", "EFT", "Visa / Mastercard", "1Voucher", "BluVoucher"],
      withdrawals: [],
      sources: [betline("lulabet", "2026-08-14")],
    },
  },
  "lucky-fish": {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "WalletDoc",
        "Stitch",
        "Samsung Pay",
        "Zapper",
        "1Voucher",
        "EasyLoad",
        "EasyPay Voucher",
      ],
      withdrawals: ["EFT to a verified bank account in your name"],
      sources: [betline("luckyfish", "2026-07-27")],
    },
  },
  lotto247: {
    payments: {
      deposits: [
        "Visa / Mastercard",
        "Ozow",
        "Capitec Pay",
        "1Voucher",
        "4ALL (EasyPay) Voucher",
        "Nedbank EFT",
      ],
      withdrawals: ["EFT to your own bank account"],
      sources: [
        {
          label: "Lotto247 FAQ",
          url: "https://www.lotto247.co.za/en/pages/faq",
          checked: "2026-11-28",
        },
        {
          label: "Lotto247 payment options",
          url: "https://www.lotto247.co.za/en/pages/payment-options",
          checked: "2026-11-28",
        },
      ],
    },
  },
  mbet: {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "Absa Pay",
        "OTT Voucher",
        "1Voucher",
        "BluVoucher",
        "Apple Pay",
        "Zapper",
        "Crypto",
      ],
      withdrawals: ["EFT (after FICA)"],
      sources: [betline("mbet", "2026-07-13")],
    },
  },
  "neo-bet": {
    payments: {
      deposits: ["Capitec Pay", "EFT", "Visa / Mastercard", "OTT Voucher", "Apple Pay", "ABSA Pay"],
      withdrawals: ["EFT"],
      sources: [betline("neobet", "2026-08-14")],
    },
  },
  onebet: {
    payments: {
      deposits: [
        "Capitec Pay",
        "EFT",
        "Ozow",
        "Visa / Mastercard",
        "Apple Pay",
        "1Voucher",
        "OTT Voucher",
        "EasyPay Voucher",
        "Peach Payments",
        "Scan to Pay",
        "BluVoucher",
        "Shop2Shop",
      ],
      withdrawals: ["Instant EFT (Peach Payments)"],
      sources: [betline("onebet", "2026-08-16")],
    },
  },
  pantherbet: {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "Zapper",
        "SnapScan",
        "1Voucher",
        "OTT Voucher",
        "EasyLoad",
        "BluVoucher",
        "EasyPay Voucher",
        "Apple Pay",
      ],
      withdrawals: [],
      sources: [betline("pantherbet", "2026-07-29")],
    },
    flags: [
      {
        text: "Pantherbet's site footer shows licence 10194613-002; the NGB register snapshot shows 10194613-001.",
        source: LICENSEDBETS,
      },
    ],
  },
  "play-co-za": {
    payments: {
      deposits: [
        "Visa / Mastercard",
        "Ozow Instant EFT",
        "Capitec Pay",
        "Instant EFT",
        "1Voucher",
        "OTT Voucher",
        "Crypto",
        "Apple Pay",
        "Google Pay",
        "EasyPay Voucher",
      ],
      withdrawals: ["To your verified bank account (R100 lifetime deposit required)"],
      sources: [
        {
          label: "Play.co.za payment options",
          url: "https://play.co.za/payment-options",
          checked: "2026-11-28",
        },
      ],
    },
  },
  playabets: {
    popularity: { rank: 15, visits: "1.99M", domain: "playabets.co.za" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "PayGate",
        "WalletDoc",
        "1Voucher",
        "OTT Voucher",
        "BluVoucher",
        "EasyLoad",
        "EasyPay / 4All Voucher",
        "AnyTime Voucher",
        "Apple Pay",
        "PayU",
        "Samsung Pay",
      ],
      withdrawals: [],
      sources: [betline("playabets", "2026-07-13")],
    },
    otherLicences: [
      {
        text: "Playabets (Pty) Ltd, Mpumalanga Economic Regulator licence 9-2-1-09689",
        source: LICENSEDBETS,
      },
    ],
  },
  playtsogo: {
    payments: {
      deposits: [
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "Zapper",
        "1Voucher",
        "OTT Voucher",
        "BluVoucher",
        "EasyPay Voucher",
        "Absa Pay",
      ],
      withdrawals: [],
      sources: [betline("playtsogo", "2026-08-09")],
    },
  },
  sportland: {},
  sportpesa: {
    popularity: { rank: 16, visits: "1.96M", domain: "sportpesa.co.za" },
    payments: {
      deposits: [
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "Peach Payments",
        "Masterpass",
        "1Voucher",
        "EasyLoad",
        "Airtime",
      ],
      withdrawals: [],
      note: "Withdrawal options are shown only after sign-in.",
      sources: [betline("sportpesa", "2026-08-14")],
    },
    flags: [
      {
        text: "SportPesa's site footer shows licence 10183090-011; the NGB register snapshot shows 10183090-010.",
        source: LICENSEDBETS,
      },
    ],
  },
  "sportingbet-sa": {
    popularity: { rank: 11, visits: "2.44M", domain: "sportingbet.co.za" },
    payments: {
      deposits: ["Ozow", "Capitec Pay", "EFT", "Visa / Mastercard", "1Voucher"],
      withdrawals: [],
      sources: [betline("sportingbet", "2026-08-09")],
    },
  },
  sportybet: {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "WalletDoc",
        "Peach Payments",
        "1Voucher",
        "OTT Voucher",
        "BluVoucher",
      ],
      withdrawals: [],
      sources: [betline("sportybet", "2026-08-14")],
    },
  },
  sunbet: {
    popularity: { rank: 6, visits: "4.48M", domain: "sunbet.co.za" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "Absa Pay",
        "OTT Voucher",
        "1Voucher",
        "BluVoucher",
        "Apple Pay",
        "Samsung Pay",
      ],
      withdrawals: [],
      sources: [betline("sunbet", "2026-08-08")],
    },
  },
  supabets: {
    popularity: { rank: 18, visits: "1.61M", domain: "supabets.co.za" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Absa Pay",
        "Visa / Mastercard",
        "PayGate",
        "Zapper",
        "1Voucher",
        "OTT Voucher",
        "BluVoucher",
        "EasyPay Voucher",
        "Crypto",
      ],
      withdrawals: ["Bank transfer (after FICA)"],
      sources: [betline("supabets", "2026-08-08")],
    },
  },
  supersportbet: {
    popularity: { rank: 5, visits: "6.49M", domain: "supersportbet.com" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "BluVoucher",
        "1Voucher",
        "OTT Voucher",
        "EasyPay Voucher",
        "Zapper",
        "SnapScan",
      ],
      withdrawals: ["Bank transfer"],
      sources: [betline("supersportbet", "2026-08-14")],
    },
  },
  swiftysports: {
    payments: {
      deposits: ["Capitec Pay", "EFT", "Visa / Mastercard", "Apple Pay", "OTT Voucher", "Crypto"],
      withdrawals: [],
      sources: [betline("swiftysports", "2026-08-08")],
    },
  },
  "topbet-sa": {
    payments: {
      deposits: [
        "Debit / credit card",
        "FNB direct bank transfer",
        "Standard Bank direct bank transfer",
        "Ozow",
        "Walletdoc",
        "1Voucher",
        "OTT Voucher",
        "BluVoucher",
        "EasyPay Voucher",
      ],
      withdrawals: [],
      sources: [betline("topbet", "2026-09-29")],
    },
  },
  "vegas-bets": {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "Peach Payments",
        "OTT Voucher",
      ],
      withdrawals: [],
      sources: [betline("vegasbets", "2026-08-14")],
    },
  },
  "world-sports-betting": {
    popularity: { rank: 7, visits: "4.34M", domain: "worldsportsbetting.co.za" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "Absa Pay",
        "WalletDoc",
        "Peach Payments",
        "Samsung Pay",
        "Google Pay",
        "1Voucher",
        "BluVoucher",
      ],
      withdrawals: [],
      sources: [betline("world-sports-betting", "2026-08-08")],
    },
  },
  yesplay: {
    popularity: { rank: 3, visits: "19.33M", domain: "yesplay.bet" },
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay by Ozow",
        "Visa / Mastercard",
        "EFT",
        "ATM deposit",
        "1Voucher",
        "YesPlay Voucher",
        "OTT Voucher",
        "BluVoucher",
        "4All Voucher",
        "Kazang",
        "EasyLoad",
        "aCoin",
        "Flash Pay",
        "Shoprite / Checkers",
        "Zapper",
        "SnapScan",
        "Google Pay",
        "Samsung Pay",
      ],
      withdrawals: [
        "EFT (first withdrawal must be EFT)",
        "ATM cash (Standard Bank Instant Money)",
        "Ezi Cash",
        "1Voucher PIN",
      ],
      note: "Two free EFT withdrawals a week, then R10 each.",
      sources: [
        {
          label: "Champsbase YesPlay review (19 deposit methods, tested)",
          url: "https://champsbase.com/en/reviews/yesplay",
          checked: "2026-11-28",
        },
        betline("yesplay", "2026-10-24"),
        {
          label: "YesPlay terms (withdrawal fees and limits)",
          url: "https://yesplay.bet/terms",
          checked: "2026-11-28",
        },
      ],
    },
  },
  zarbet: {
    payments: {
      deposits: [
        "Ozow",
        "Capitec Pay",
        "EFT",
        "Visa / Mastercard",
        "Samsung Pay",
        "Apple Pay",
        "1Voucher",
        "OTT Voucher",
      ],
      withdrawals: [],
      note: "Minimum withdrawal is R250 per transaction.",
      sources: [betline("zarbet", "2026-08-14")],
    },
  },
  "1xbet": {
    payments: {
      deposits: ["Visa / Mastercard", "Instant EFT", "E-wallets (Skrill, Neteller)", "Crypto"],
      withdrawals: ["Visa / Mastercard", "E-wallets (Skrill, Neteller)", "Crypto"],
      unverified: true,
      note: "1xBet shows its cashier only after sign-in, and third-party reviews disagree on which South African methods are offered. Check the cashier before depositing.",
      sources: [
        {
          label: "Betzoid 1xBet South Africa review",
          url: "https://betzoid.com/za/1xbet-review/",
          checked: "2026-11-28",
        },
        {
          label: "Best Betting Sites South Africa: 1xBet review",
          url: "https://www.best-betting-sites-south-africa.com/review-bonus-1xbet",
          checked: "2026-11-28",
        },
      ],
    },
    otherLicences: [
      {
        text: "Curaçao Gaming Authority B2C licence OGL/2024/1262/0493, granted 7 November 2024, status Active; 1xbet.com is an approved domain.",
        source: {
          label: "Curaçao Gaming Authority certificate",
          url: "https://cert.cga.cw/token?id=493",
          checked: "2026-11-28",
        },
      },
    ],
  },
};

export function bookmakerProfile(slug: string): BookmakerProfile {
  return bookmakerProfiles[slug] ?? {};
}

/** Brandfetch logo CDN (hotlink, browser rendering only). The UI falls back to initials when it 404s. */
export function brandfetchLogo(domain: string): string {
  return `https://cdn.brandfetch.io/domain/${domain}/w/128/h/128/fallback/404?c=1idRUZaGIxsHRZL8WVX`;
}
