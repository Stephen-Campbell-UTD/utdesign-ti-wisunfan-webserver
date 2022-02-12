import {NCPProperties} from './App';
import {
  Pingburst,
  PingburstAbortStatus,
  PingburstCreateRequest,
  RequestStatus,
  Topology,
} from './types';

export class APIService {
  static host: string = window.location.origin;

  public static get pingResultsRoute() {
    return `${APIService.host}/PingResults.csv`;
  }

  static prependHost(route: string): string {
    return `${APIService.host}${route}`;
  }

  static async fetchJSON(route: string, fetchOptions?: any): Promise<any> {
    let res;
    try {
      res = await fetch(APIService.prependHost(route), fetchOptions);
    } catch (e) {
      //network error
      throw e;
    }
    try {
      const data = res.json();
      return data;
    } catch (e) {
      //json parsing error
      throw e;
    }
  }

  static async getReset(): Promise<RequestStatus> {
    const {wasSuccess} = await APIService.fetchJSON('/reset');
    return wasSuccess;
  }
  static async getTopology(): Promise<Topology> {
    return await APIService.fetchJSON('/topology');
  }
  static async getProps(): Promise<NCPProperties> {
    const data = await APIService.fetchJSON('/getProps');
    return data;
  }
  static async setProp(
    property: keyof NCPProperties,
    value: NCPProperties[keyof NCPProperties]
  ): Promise<RequestStatus> {
    const data = await APIService.fetchJSON(`/setProp?property=${property}&newValue=${value}`);
    return data;
  }

  static async getConnected(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);
    const success = await APIService.fetchJSON('/connected', {signal: controller.signal});
    clearTimeout(timeoutId);
    return success;
  }

  //** Initiate a pingburst */
  static async postPingbursts(body: PingburstCreateRequest): Promise<number> {
    const requestOpts = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify(body),
    };
    const {id} = await APIService.fetchJSON('/pingbursts', requestOpts);
    return id;
  }
  //**All server saved pingbursts */
  static async getPingbursts(): Promise<Pingburst[]> {
    return await APIService.fetchJSON('/pingbursts');
  }

  //**Singular Pingburst */
  static async getPingburst(id: number): Promise<Pingburst> {
    return await APIService.fetchJSON(`/pingburst/${id.toString(10)}`);
  }
  //**Abort Pingburst */
  static async getAbortPingburst(id: number): Promise<PingburstAbortStatus> {
    return await APIService.fetchJSON(`/pingbursts/${id.toString(10)}/abort`);
  }
}
