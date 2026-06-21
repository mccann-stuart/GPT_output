async function run() {
  const url = 'https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jun/2026&Dateto=21/Jun/2026&SeriesCodes=IUDBEDR,IUDSOIA&CSVF=TN&UsingCodes=Y';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const text = await res.text();
    console.log(text.slice(0, 1000));
  } catch (err) {
    console.error(err);
  }
}
run();
