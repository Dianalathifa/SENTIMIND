import { CONFIG } from 'src/config-global';

import { PublicAnalysisResultView }  from 'src/sections/public_analysis_request/view/result';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Publics - ${CONFIG.appName}`}</title>

      < PublicAnalysisResultView />
    </>
  );
}
