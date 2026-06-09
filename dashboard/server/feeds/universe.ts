// ── S&P 500 constituents ──────────────────────────────────────────────────
export const SP500_STOCKS = [
  "A","AAPL","ABBV","ABNB","ABT","ACGL","ACN","ADBE","ADI","ADM",
  "ADP","ADSK","AEE","AEP","AES","AFL","AIG","AIZ","AJG","AKAM",
  "ALB","ALGN","ALL","ALLE","AMAT","AMCR","AMD","AME","AMGN","AMP",
  "AMT","AMZN","ANET","AON","AOS","APA","APD","APH","APO","APP",
  "APTV","ARE","ARES","ATO","AVB","AVGO","AVY","AWK","AXON","AXP",
  "AZO","BA","BAC","BALL","BAX","BBY","BDX","BEN","BF.B","BG",
  "BIIB","BKNG","BKR","BLDR","BLK","BMY","BNY","BR","BRK.B","BRO",
  "BSX","BX","BXP","C","CAG","CAH","CARR","CASY","CAT","CB",
  "CBOE","CBRE","CCI","CCL","CDNS","CDW","CEG","CF","CFG","CHD",
  "CHRW","CHTR","CI","CIEN","CINF","CL","CLX","CMCSA","CME","CMG",
  "CMI","CMS","CNC","CNP","COF","COHR","COIN","COO","COP","COR",
  "COST","CPAY","CPB","CPRT","CPT","CRH","CRL","CRM","CRWD","CSCO",
  "CSGP","CSX","CTAS","CTSH","CTVA","CVNA","CVS","CVX","D","DAL",
  "DASH","DD","DDOG","DE","DECK","DELL","DG","DGX","DHI","DHR",
  "DIS","DLR","DLTR","DOC","DOV","DOW","DPZ","DRI","DTE","DUK",
  "DVA","DVN","DXCM","EA","EBAY","ECL","ED","EFX","EG","EIX",
  "EL","ELV","EME","EMR","EOG","EQIX","EQR","EQT","ERIE","ES",
  "ESS","ETN","ETR","EVRG","EW","EXC","EXE","EXPD","EXPE","EXR",
  "F","FANG","FAST","FCX","FDS","FDX","FE","FFIV","FICO","FIS",
  "FISV","FITB","FIX","FOX","FOXA","FRT","FSLR","FTNT","FTV","GD",
  "GDDY","GE","GEHC","GEN","GEV","GILD","GIS","GL","GLW","GM",
  "GNRC","GOOG","GOOGL","GPC","GPN","GRMN","GS","GWW","HAL","HAS",
  "HBAN","HCA","HD","HIG","HII","HLT","HON","HOOD","HPE","HPQ",
  "HRL","HSIC","HST","HSY","HUBB","HUM","HWM","IBKR","IBM","ICE",
  "IDXX","IEX","IFF","INCY","INTC","INTU","INVH","IP","IQV","IR",
  "IRM","ISRG","IT","ITW","IVZ","J","JBHT","JBL","JCI","JKHY",
  "JNJ","JPM","KDP","KEY","KEYS","KHC","KIM","KKR","KLAC","KMB",
  "KMI","KO","KR","KVUE","L","LDOS","LEN","LH","LHX","LII",
  "LIN","LITE","LLY","LMT","LNT","LOW","LRCX","LULU","LUV","LVS",
  "LYB","LYV","MA","MAA","MAR","MAS","MCD","MCHP","MCK","MCO",
  "MDLZ","MDT","MET","META","MGM","MKC","MLM","MMM","MNST","MO",
  "MOS","MPC","MPWR","MRK","MRNA","MRSH","MS","MSCI","MSFT","MSI",
  "MTB","MTD","MU","NCLH","NDAQ","NDSN","NEE","NEM","NFLX","NI",
  "NKE","NOC","NOW","NRG","NSC","NTAP","NTRS","NUE","NVDA","NVR",
  "NWS","NWSA","NXPI","O","ODFL","OKE","OMC","ON","ORCL","ORLY",
  "OTIS","OXY","PANW","PAYX","PCAR","PCG","PEG","PEP","PFE","PFG",
  "PG","PGR","PH","PHM","PKG","PLD","PLTR","PM","PNC","PNR",
  "PNW","PODD","POOL","PPG","PPL","PRU","PSA","PSKY","PSX","PTC",
  "PWR","PYPL","Q","QCOM","RCL","REG","REGN","RF","RJF","RL",
  "RMD","ROK","ROL","ROP","ROST","RSG","RTX","RVTY","SATS","SBAC",
  "SBUX","SCHW","SHW","SJM","SLB","SMCI","SNA","SNDK","SNPS","SO",
  "SOLV","SPG","SPGI","SRE","STE","STLD","STT","STX","STZ","SW",
  "SWK","SWKS","SYF","SYK","SYY","T","TAP","TDG","TDY","TECH",
  "TEL","TER","TFC","TGT","TJX","TKO","TMO","TMUS","TPL","TPR",
  "TRGP","TRMB","TROW","TRV","TSCO","TSLA","TSN","TT","TTD","TTWO",
  "TXN","TXT","TYL","UAL","UBER","UDR","UHS","ULTA","UNH","UNP",
  "UPS","URI","USB","V","VEEV","VICI","VLO","VLTO","VMC","VRSK",
  "VRSN","VRT","VRTX","VST","VTR","VTRS","VZ","WAB","WAT","WBD",
  "WDAY","WDC","WEC","WELL","WFC","WM","WMB","WMT","WRB","WSM",
  "WST","WTW","WY","WYNN","XEL","XOM","XYL","XYZ","YUM","ZBH",
  "ZBRA","ZTS",
]

// Additional liquid non-S&P names for broader coverage
export const EXTRA_STOCKS = [
  "ABNB","AI","ALAB","ASTS","AXSM","CAVA","CELH","CERE","CIFR","CLSK",
  "COUR","CRSP","CZR","DKNG","ENPH","FSLR","GFS","GLBE","HOOD","HUT",
  "IONQ","IREN","MARA","MDB","MRNA","MSTR","OKLO","OKTA","ONDS","OPEN",
  "PLUG","QBTS","RGTI","RIVN","ROKU","RXRX","SOUN","SPOT","SQ","TEAM",
  "TOST","TWLO","UPST","VKTX","VFS","WOLF","ZS",
]

// ── ETF universe ──────────────────────────────────────────────────────────
export const ETF_UNIVERSE = [
  // Broad market
  "SPY","QQQ","IWM","DIA","VTI","VOO","VXF","ITOT","SCHX","SCHB",
  "IWV","IWB","IWD","IWF","IJR","IJS","IJT","IJH","MDY","SCHM",
  // Sectors
  "XLK","XLF","XLE","XLV","XLI","XLU","XLP","XLRE","XLB","XLY",
  "XRT","XHB","XBI","XME","KRE","KBE","IYR","SMH","SOXX","SOXL",
  "IBB","ARKK","ARKW","ARKG","ARKF","ARKQ",
  // Factors
  "MTUM","QUAL","VLUE","SIZE","USMV","SPHD","SPLV","DVY","VYM","SCHD",
  // International
  "EEM","VWO","EFA","IEFA","VXUS","VEA","VEU","VSS","SCZ","IEMG",
  "EWJ","EWG","EWQ","EWU","EWY","FXI","EWZ","INDA","EWW","EPP",
  "ILF","FEZ","VGK","SCHF","BKF","ASHR","KWEB",
  // Bonds / Fixed Income
  "TLT","IEF","SHY","BND","AGG","HYG","LQD","JNK","TIP","BIL",
  "GOVT","SCHO","SCHR","SCHZ","VCIT","VCSH","VCLT","EMB","PCY","BKLN",
  // Commodity
  "GLD","SLV","USO","UNG","DBC","GSG","DJP","USCI","PPLT","PALL",
  "CPER","GLDM","IAU","BNO","OIL","UGA",
  // Crypto-linked
  "IBIT","FBTC","ETHU","BITB","ARKB","HODL","BITO","BITX","WGMI",
  // Thematic
  "TAN","ICLN","QCLN","PBW","PBD","ERTH","LIT","REMX","BOTZ","ROBO",
  "CLOU","SKYY","WCLD","FINX","IPAY","SOCL","ESPO","BATT","PRNT","IDRV",
  // Leveraged / Inverse
  "TQQQ","SQQQ","SPXL","SPXS","QLD","SSO","UPRO","SH","SDS","PSQ",
  "TECL","LABU","FAS","FAZ","SOXL","SOXS",
  // Dividend / Income
  "JEPI","JEPQ","QYLD","XYLD","NUSI","GOF","PDI","PGX","PFF","DSL",
  // Real Estate / Infra
  "VNQ","SCHH","REET","SRVR","VPN","TOLZ",
]

// ── Crypto universe (Binance USDT pairs) ──────────────────────────────────
export const CRYPTO_UNIVERSE = [
  "BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","ADAUSDT","AVAXUSDT",
  "DOTUSDT","LINKUSDT","DOGEUSDT","SUIUSDT","ARBUSDT","OPUSDT",
  "ATOMUSDT","NEARUSDT","APTUSDT","FETUSDT","INJUSDT","SEIUSDT",
  "TIAUSDT","BNBUSDT","TRXUSDT","BCHUSDT","LTCUSDT","XLMUSDT",
  "HBARUSDT","SHIBUSDT","UNIUSDT","AAVEUSDT","ETCUSDT","ICPUSDT",
  "FILUSDT","VETUSDT","ALGOUSDT","MKRUSDT","RENDERUSDT","RUNEUSDT",
  "ARUSDT","LDOUSDT","MNTUSDT","GRTUSDT","THETAUSDT","XMRUSDT",
  "EOSUSDT","QNTUSDT","FLOWUSDT","SANDUSDT","MANAUSDT","AXSUSDT",
  "GALAUSDT","CHZUSDT","ENJUSDT","SNXUSDT","CRVUSDT","COMPUSDT",
  "DYDXUSDT","PENDLEUSDT","PEPEUSDT","WIFUSDT","BONKUSDT","FLOKIUSDT",
  "TAOUSDT","ARKMUSDT","WLDUSDT","STRKUSDT","MANTAUSDT","METISUSDT",
]

// ── Commodity universe (AMEX ETFs) ────────────────────────────────────────
export const COMMODITY_UNIVERSE = [
  "AMEX:GLD","AMEX:SLV","AMEX:USO","AMEX:UNG","AMEX:DBC","AMEX:PPLT","AMEX:PALL","AMEX:CPER","AMEX:WEAT","AMEX:CORN",
  "AMEX:SOYB","AMEX:CANE","AMEX:COW","AMEX:BAL","AMEX:CAFE","AMEX:SGG","AMEX:JO","AMEX:NIB","AMEX:DBA","AMEX:JJG",
  "AMEX:GLDM","AMEX:IAU","AMEX:BNO","AMEX:OIL","AMEX:UGA","AMEX:GSG","AMEX:DJP","AMEX:USCI",
]
