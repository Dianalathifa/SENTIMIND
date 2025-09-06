import { CONFIG } from 'src/config-global';

import { CrawlingUserView }  from 'src/sections/crawling/user-view/crawling-user';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Crawlings - ${CONFIG.appName}`}</title>

      < CrawlingUserView />
    </>
  );
}
