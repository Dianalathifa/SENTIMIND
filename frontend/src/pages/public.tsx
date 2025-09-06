import { CONFIG } from 'src/config-global';

import {PublicAnalysisRequestView}  from 'src/sections/public_analysis_request/view/request';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Publics - ${CONFIG.appName}`}</title>

      < PublicAnalysisRequestView />
    </>
  );
}
