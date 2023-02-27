
//regex   : class ([^(\s]+)\(_?([^)]+)\):pass\n
//replace : class $1 extends $2 { }\n

export namespace GoogleChart {
  const __version__ = "0.2.2";
  const __author__ = "Gerald Kaszuba";
  const reo_colour = new RegExp("^([A-Fa-f0-9]{2,2}){3,4}$");

  export class Chart {
    globals: Record<string, any> = {};

    get_url(): string {
      return "http://chart.apis.google.com/chart?cht=lxy&chs=600x300&chd=e:DLDvEPEYE6FNGCGgG3HJHhHrH2ICIUIZIwI9JeJtJyKDKPKZKkLELNLZLhMRMbMsM1NSNZNkN2OBOFOMOROuO2PSPcPhPoPyP7QiQ.RLReRmR5SISSSdSnS4TGTTTYTcToT0T8UIUZUkUnUuU7VHVYVfVjV5WFWKWYWgWsW7XCXQXcXfXjXrXvX7YZYvY9ZLZQZYZfZvaIabaqa9bMbRbabhb6cRciczc4dEdHdQdYd-ele7fAfJfMfXfpgAgFgUgegigng9hHhRhXhtici2i.jTkBkRkeknkulHmImPmnnAnJnTndnwnzoGoZooo5pApKpdqIqNqUqxrErQrhrzr6sKsbshsnsztMtVtut-uQuZueunutvCvFvPvnvywGwoxPxyx6yNyVyjzDzYznzz0Q0c0s1D1O1g1w182L2V2Z2e2m293D3H3W3d4B4Q4q5M,NBNBKxKxJEHXD9C.CCCdEDD9EfEKEYD9ERDaFIFqGTHQG8FqGnEzEzD9DoFxGnGnF3FOFxFxHQGuHCGuHCH5IiHXH5HlIiIiJtLoOZNjOuO1QbRfTNSqTaT8VwU6VwWMWMYUX5ZLYpaBadaIbGbMc6cRcXeZdwenfXfXgbgohfgoiIh0iIiIixhYixiPixixiBh0iIhYiIg9gbeLdVcsclcKZ6Y9XkXkYGXyX5XXXrXrUYT8URUYU6UzVVVcV-XJY9Y2ZSaBZfZYaBbMfri.jFkRpRpmqqqWrFsQyxyPza3P343k345z5f5Y3k3d2S2t2L0QyqyPyxyPzazny4znzTzMznzTznzT1i1O273J495D5Y5Y5z5m6B6I636V6c4ayVuLtprFqqpKksjFijhtgNeZdOajZ0XJWZVOUYS4TTSISPO1PXPCPCOnOgM6MfMs&chf=bg,s,ffffff00%7cc,s,ffffffcc&chxt=x,y&chxl=0:%7c15%3A05%7c15%3A10%7c15%3A15%7c15%3A20%7c15%3A25%7c15%3A30%7c15%3A35%7c15%3A40%7c15%3A45%7c15%3A50%7c15%3A55%7c16%3A00&chxr=1,1250,1850&chxp=0,3550,3562,3575,3588,0,12,25,38,50,62,75,88&chxs=0,ffffff%7c1,ffffff&chg=12.5,8.3,2,2";
    }
    _check_colour(colour: string) {
      if (!reo_colour.test(colour)) {
        throw new Error("Colours need to be in RRGGBB or RRGGBBAA format. One of your colours has " + colour);
      }
    }

    _reset_warnings() {
      /* Helper function to reset all warnings. Used by the unit tests. */
      this.globals["__warningregistry__"] = null;
    }

  }

  class PyGoogleChartException extends Error { }
  class DataOutOfRangeException extends PyGoogleChartException { }
  class UnknownDataTypeException extends PyGoogleChartException { }
  class NoDataGivenException extends PyGoogleChartException { }
  class InvalidParametersException extends PyGoogleChartException { }
  class BadContentTypeException extends PyGoogleChartException { }
  class AbstractClassException extends PyGoogleChartException { }
  class UnknownChartType extends PyGoogleChartException { }

  class Data {
    //TODO
  }
}