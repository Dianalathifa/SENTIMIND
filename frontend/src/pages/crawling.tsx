import { CONFIG } from 'src/config-global';

import {CrawlingView}  from 'src/sections/crawling/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Crawlings - ${CONFIG.appName}`}</title>

      < CrawlingView />
    </>
  );
}
