import { getFullName } from './commonFunctions.js';

/**
 * Custom submit function
 * @param {scope} globals
 */
function submitFormArrayToString(globals) {
  const data = globals?.functions?.exportData?.() ?? {};
  Object.keys(data).forEach((key) => {
    if (Array.isArray(data[key])) {
      data[key] = data[key].join(',');
    }
  });
  globals?.functions?.submitForm?.(data, true, 'application/json');
}

/**
 * Calculate the number of days between two dates.
 * @param {*} endDate
 * @param {*} startDate
 * @returns {number} returns the number of days between two dates
 */
function days(endDate, startDate) {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // return zero if dates are valid
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffInMs = Math.abs(end.getTime() - start.getTime());
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}


/**
 * Handles request retries with up to 2 retry attempts
 * @param {function} requestFn - The request function to execute
 * @return {Promise} A promise that resolves with the response or rejects after all retries
 */
function retryHandler(requestFn) {
  const MAX_RETRIES = 2;

  /**
   * Attempts the request with retry metadata
   * @param {number} retryCount - Current retry attempt count
   * @return {Promise} The request promise
   */
  function attemptRequest(retryCount = 0) {
      // Include retry metadata if this is a retry
      const requestOptions = retryCount > 0 ? {
          headers: {
              'X-Retry': 'true',
              'X-Retry-Count': retryCount.toString(),
              'X-Retry-Time': new Date().toISOString()
          },
          body: {
              retry: true,
              retryCount: retryCount,
              timestamp: Date.now()
          }
      } : undefined;

      return requestFn(requestOptions)
          .then(function(response) {
              if (response?.status >= 400) {
                  console.warn('Request failed with status ' + response.status);
                  throw new Error('Request failed with status ' + response.status);
              }
              return response;
          })
          .catch(function(error) {
              console.warn('Request attempt ' + (retryCount + 1) + ' failed:', error.message);

              // Retry if max attempts not reached
              if (retryCount < MAX_RETRIES) {
                  console.log('Retrying request, attempt ' + (retryCount + 2) + ' of ' + (MAX_RETRIES + 1));

                  // Exponential backoff delay: 1s, 2s, 4s...
                  const delay = Math.pow(2, retryCount) * 1000;

                  return new Promise(function(resolve) {
                      setTimeout(resolve, delay);
                  }).then(function() {
                      return attemptRequest(retryCount + 1);
                  });
              } else {
                  // All retries exhausted
                  console.error('All retry attempts failed. Final error:', error.message);
                  throw new Error('Request failed after ' + (MAX_RETRIES + 1) + ' attempts: ' + error.message);
              }
          });
  }

  // Start the first attempt
  return attemptRequest(0);
}

// eslint-disable-next-line import/prefer-default-export
export { getFullName, days, submitFormArrayToString, retryHandler };
