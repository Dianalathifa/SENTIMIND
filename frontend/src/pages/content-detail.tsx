import { _posts } from 'src/_mock';
import { CONFIG } from 'src/config-global';

import { ContentDetailView } from 'src/sections/content/view/content-detail';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`ContentDetail - ${CONFIG.appName}`}</title>

      <ContentDetailView  />
    </>
  );
}
