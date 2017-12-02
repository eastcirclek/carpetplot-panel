# Carpet plot

Carpet plot plugin for Grafana. It is different from [petraslavotinek/grafana-carpetplot](https://github.com/petrslavotinek/grafana-carpetplot) in that it groups time-series data first by time and then by a tag provided by user. 
You must group by not only time but also a tag to use this carpet plot plugin. Don't forget to specify _[$tag_yourTagName](http://docs.grafana.org/features/datasources/influxdb/#alias-patterns)_ in the "ALIAS BY" field to avoid long tag names like _yourMeasurement.mean {yourTagName: tagValue}_. 
![Carpet plot - Screenshot 1 - Query](https://raw.githubusercontent.com/eastcirclek/carpetplot-panel/master/dist/src/img/screenshot1.png)

#### [eastcirclek/grafana-carpetplot](https://github.com/eastcirclek/carpetplot-panel)

![Carpet plot - Screenshot 2 - Panel](https://raw.githubusercontent.com/eastcirclek/carpetplot-panel/master/dist/src/img/screenshot2.png)

#### [petraslavotinek/grafana-carpetplot](https://github.com/petrslavotinek/grafana-carpetplot) 

![Carpet plot - Screenshot 2 - Panel](https://raw.githubusercontent.com/petrslavotinek/grafana-carpetplot/master/dist/src/img/screenshot2.png)

Note that [petraslavotinek/grafana-carpetplot](https://github.com/petrslavotinek/grafana-carpetplot) groups the data first by day and then by a selected fragment of a day.

## Together with [eastcirclek/piechart-panel](https://github.com/eastcirclek/piechart-panel)
 

## Changelog

* 0.0.1 : first version