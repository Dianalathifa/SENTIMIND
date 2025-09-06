import { CONFIG } from 'src/config-global';

import { PublicRequestAdminView }  from 'src/sections/public_analysis_request/admin/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Publics - ${CONFIG.appName}`}</title>

      < PublicRequestAdminView />
    </>
  );
}
