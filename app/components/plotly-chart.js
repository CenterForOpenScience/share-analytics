/* global c3 */
import Ember from 'ember';

export default Ember.Component.extend({

    classNames: ['chart'],
    charttitle: 'Untitled Chart',

    dataChanged: Ember.observer('aggregations', function() {
        this.updateChart();
    }),

    data: [],

    sizeChanged: Ember.observer('resizedSignal', function() {
        console.log("get resizedSignal");
        if (this.get('resizedSignal') === false) return;
        this.updateChart();
        this.set('resizedSignal', false);
    }),

    charTypeChange: Ember.observer('chartType', function(){
        this.updateChart();
    }),

    updateChart() {

        function log10ToLinear(log_num) {
            if (log_num > 0) {
                return 0;
            }
            return Math.pow(10, log_num-1).toFixed(0);
        }

        function linearToLog10(lin_num) {
            if (lin_num <= 0) {
                return 0;
            }
            return (Math.log(lin_num) / Math.LN10) + 1;
        }

        let chart_type = this.get('chartType');

        let chart_options = {
            bindto: this.element,
            data: {
                columns: null, //to be filled later
                type: chart_type,
                onclick: (d) => {
                    this.attrs.transitionToFacet(d);
                },
            },
            legend: { show: false },
            [chart_type]: {
                title: this.get('charttitle'),  //to be filled later
                label: {
                    show: false
                }
            },
        };

        if (chart_type == 'donut') {
            var title = '';
            var columns;
            if (this.get('name') === 'Publishers') {
              this.set('data', this.get('aggregations.publishers.buckets'));
              columns = this.get('data').map(({ key, doc_count }) => [key, doc_count]);
            } else if (this.get('name') === 'Events by Source'){
              this.set('data', this.get('aggregations.sources.buckets'));
              columns = this.get('data').map(({ key, doc_count }) => [key, doc_count]);
            } else {
                this.set('data', this.get('aggregations.sources.buckets'));
                columns = [['FIC', 685870], ['NCATS', 11798267], ['NCCIH', 527109], ['NCI', 37421432], ['NEI', 9258786], ['NHGRI', 5050824], ['NHLBI', 37973512], ['NIA', 30039371], ['NIAAA', 6709896], ['NIAID', 44746441], ['NIAMS', 6571101], ['NIBIB', 4005180], ['NICHD', 13278402], ['NIDA', 29823005], ['NIDCD', 4439991], ['NIDCR', 1155900], ['NIDDK', 32526462], ['NIEHS', 4674188], ['NIGMS', 53652460], ['NIMH', 38119017], ['NINDS', 20635337], ['NINR', 1976020], ['NLM', 1069055], ['OD', 4275564]];
            }
            let labels = columns.map(function(value, index){ return value[0];});
            let values = columns.map(function(value, index){ return value[1];});
            var data = [{
              values: values,
              labels: labels,
              hoverinfo: 'label+percent',
              hole: .6,
              type: 'pie',
              direction	: 'clockwise',
              textinfo: 'none',
            }];

            var layout = {
              annotations:[{
                  font: {
                    size: 12
                  },
                  showarrow: false,
                  x: 0.5,
                  y: 0.5,
                  text: '',
                }],
              paper_bgcolor	:	'rgba(0,0,0,0)',
              height: 320,
              // autosize: true,
              margin:{l: 25, r: 20, t: 20, b: 20, pad: 0},
              showlegend: false,
            };

        } else if (chart_type == 'bar') {

            this.set('data', this.get('aggregations.contributors.buckets'));
            var columns = this.get('data').map(({ key, doc_count }) => [key, doc_count]).slice(0, 10);

            chart_options['axis'] = {
                x: {
                    tick: {
                        format: function() {
                            return 'Top 10 Contributors';
                        }
                    }
                },
                y: {
                     label: 'Number of Publications'
                },
            };
            chart_options['tooltip'] = {
                grouped: false, // Default true
            };
            chart_options['tooltip'] = tooltip;

        } else if (chart_type == 'relevanceHistogram') {

            let UC_hits = this.get('aggregations.filtered_score.buckets.institution.doc_count');
            let total_hits = this.get('total');

            var columns = [
                ['overallCountByRelevance'].concat(this.get('data.aggregations.all_score.buckets').map((datum) => {
                    let val = this.get('aggregations.all_score.buckets')[datum.key];
                    if (val && val.doc_count > 0) { return val.doc_count * UC_hits / total_hits; }
                    return 0;
                })),
                ['ucCountByRelevance'].concat(this.get('aggregations.all_score.buckets').map((datum) => {
                    let val = this.get('aggregations.filtered_score.buckets.institution.score.buckets')[datum.key];
                    if (val && val.doc_count > 0) { return val.doc_count; }
                    return 0;
                })),
            ];

            var data = [
              {y:columns[0].slice(1, -1),
               name: 'overallCountByRelevance',
               type: 'bar'
             },
             {y:columns[1].slice(1, -1),
              name: 'ucCountByRelevance',
              type: 'bar'
             }
           ];
            var layout = {barmode: 'group', paper_bgcolor	:	'rgba(0,0,0,0)', xaxis:{title: 'Relevnace Score'}, yaxis: {title: 'Number of Items', showline: true}};

        } else if (chart_type == 'timeseries') {
            let x_axis = this.get('data.aggregations.all_over_time.buckets').map((datum) => { return datum.key_as_string })
            var columns = this.get('data.aggregations.sorted_by_type.buckets').map((bucket) => {
                return [bucket.key].concat(bucket['type_over_time'].buckets.reduce((ret, bucket) => {
                    ret[x_axis.indexOf(bucket.key_as_string)] = linearToLog10(bucket.doc_count);
                    return ret;
                }, (new Array(x_axis.length)).fill(0)));
            });
            columns.unshift(['x'].concat(x_axis))
            columns.unshift(['All Events'].concat(this.get('data.aggregations.all_over_time.buckets').map((bucket) => {
                return linearToLog10(bucket.doc_count);
            })))
            console.log(columns[0].length);
            console.log(x_axis.length);

            var data = [];
            for(var i = 0; i < columns.length; i++){
              data.push({x:x_axis, y: columns[i].slice(1, columns[i].length), fill: 'tozeroy', type: 'scatter', name: columns[i][0], line:{shape:'spline'}});
            }

            layout = {xaxis:{}, paper_bgcolor	:	'rgba(0,0,0,0)', yaxis:{title: 'Number of Items (Log Scale)', tickformat: log10ToLinear, showline:true, showticklabels: true}};
        }

        Plotly.newPlot(this.element, data, layout, {displayModeBar: false});
        var graph = this.element;
        window.addEventListener("resize", function(){
          Plotly.Plots.resize(graph);
        });
      },

      didRender() {
          this.updateChart();
      },

  });
