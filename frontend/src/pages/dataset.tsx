import { CONFIG } from 'src/config-global';

import {TweetDatasetView}  from 'src/sections/dataset/view/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Crawlings - ${CONFIG.appName}`}</title>

      < TweetDatasetView />
    </>
  );
}
