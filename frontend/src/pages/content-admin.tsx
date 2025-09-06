import { _posts } from 'src/_mock';
import { CONFIG } from 'src/config-global';

import { ContentViewAdmin } from 'src/sections/content/admin/content-admin';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`ContentAdmin - ${CONFIG.appName}`}</title>

      <ContentViewAdmin />
    </>
  );
}
