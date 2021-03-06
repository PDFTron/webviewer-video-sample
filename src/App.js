import React, { useRef, useEffect, useState } from 'react';
import WebViewer from '@pdftron/webviewer';
import { initializeVideoViewer, renderControlsToDOM } from '@pdftron/webviewer-video';
import './App.css';

const DOCUMENT_ID = 'video';

const App = () => {
  const viewer = useRef(null);
  const inputFile = useRef(null);
  const [ wvLoadVideo, setWvLoadVideo ] = useState(null);
  const license = `---- Insert commercial license key here after purchase ----`;

  // if using a class, equivalent of componentDidMount
  useEffect(() => {
    WebViewer(
      {
        path: '/webviewer/lib',
        selectAnnotationOnCreation: true,
        // Fix for ie11. It can't switch to dark mode so we do it manually.
        ...(window.document.documentMode && { css: '../../../styles.css' }),
      },
      viewer.current,
    ).then(async instance => {
      instance.openElements('notesPanel');

      // Extends WebViewer to allow loading HTML5 videos (.mp4, ogg, webm).
      const {
        loadVideo,
      } = await initializeVideoViewer(
        instance,
        license,
      );

      // Store loadVideo function
      setWvLoadVideo(() => loadVideo);

      // Load a video at a specific url. Can be a local or public link
      // If local it needs to be relative to lib/ui/index.html.
      // Or at the root. (eg '/video.mp4')
      const videoUrl = 'https://pdftron.s3.amazonaws.com/downloads/pl/video/video.mp4';
      loadVideo(videoUrl);

      const { docViewer, setHeaderItems } = instance;
      const annotManager = docViewer.getAnnotationManager();

      // Add save annotations button
      setHeaderItems(header => {
        header.push({
          type: 'actionButton',
          disable: process.env.DEMO,
          img: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
          title: 'Save annotations',
          onClick: async () => {
            // Save annotations when button is clicked
            // widgets and links will remain in the document without changing so it isn't necessary to export them

            // Make a POST request with XFDF string
            const saveXfdfString = (documentId, xfdfString) => {
              return new Promise(resolve => {
                fetch(`/server/annotationHandler.js?documentId=${documentId}`, {
                  method: 'POST',
                  body: xfdfString,
                }).then(response => {
                  if (response.status === 200) {
                    resolve();
                  }
                });
              });
            };

            const annotations = docViewer.getAnnotationManager().getAnnotationsList();
            var xfdfString = await annotManager.exportAnnotations({ links: false, widgets: false, annotList: annotations });
            await saveXfdfString(DOCUMENT_ID, xfdfString);
            alert('Annotations saved successfully.');
          }
        });

        // Add a download file button
        header.push({
          type: 'actionButton',
          dataElement: 'video-downloadFileButton',
          title: `Download file`,
          img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.cls-1{fill:#abb0c4;}</style></defs><title>icon - header - download</title><path class="cls-1" d="M11.55,17,5.09,9.66a.6.6,0,0,1,.45-1H8.67V2.6a.6.6,0,0,1,.6-.6h5.46a.6.6,0,0,1,.6.6V8.67h3.13a.6.6,0,0,1,.45,1L12.45,17A.6.6,0,0,1,11.55,17ZM3.11,20.18V21.6a.4.4,0,0,0,.4.4h17a.4.4,0,0,0,.4-.4V20.18a.4.4,0,0,0-.4-.4h-17A.4.4,0,0,0,3.11,20.18Z"/></svg>',
          onClick: async () => {
            const anchor = document.createElement('a');
            anchor.href = videoUrl;
            anchor.target = "_blank";
            anchor.download = 'video.mp4'; // filename
            // Auto click on a element, trigger the file download
            anchor.click();
          }
        });

        // Add upload file button
        header.push({
          type: 'actionButton',
          img: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="24px" height="24px"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h4v-2H5V8h14v10h-4v2h4c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm-7 6l-4 4h3v6h2v-6h3l-4-4z"/></svg>',
          title: 'Load video file',
          onClick: () => {
            inputFile.current.click();
          }
        });
      });

      // Load saved annotations
      docViewer.on('documentLoaded', async () => {
        const video = docViewer.getDocument().getVideo();
        const loadXfdfString = documentId => {
          return new Promise(resolve => {
            fetch(`/server/annotationHandler.js?documentId=${documentId}`, {
              method: 'GET'
            }).then(response => {
              if (response.status === 200) {
                response.text()
                  .then(xfdfString => {
                    resolve(xfdfString);
                  });
              } else if (response.status === 204) {
                console.warn(`Found no content in xfdf file /server/annotationHandler.js?documentId=${documentId}`);
                resolve('');
              } else {
                console.warn(`Something went wrong trying to load xfdf file /server/annotationHandler.js?documentId=${documentId}`);
                console.warn(`Response status ${response.status}`);
                resolve('');
              }
            });
          });
        };

        if (!process.env.DEMO) {
          // Make a GET request to get XFDF string
          const xfdfString = await loadXfdfString(DOCUMENT_ID);
          await annotManager.importAnnotations(xfdfString);
          video.updateAnnotationsToTime(0);
        } else {
          const demoXfdfString = `<?xml version="1.0" encoding="UTF-8" ?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><annots><square page="0" rect="359.82000000000005,353.46,579.57,531.0699999999999" color="#E44234" flags="print,noview" name="c299ec3e-53a6-434b-6b9b-f3585157106f" title="Guest" subject="Rectangle" date="D:20200926015122-07'00'" start-time="247.58240354672685" end-time="293.3412691426693" interior-color="#E2A1E6" width="13" opacity="0.5033557046979865" creationdate="D:20200915221144-07'00'"/><circle page="0" rect="113.38,394.88,266.66,513.3199999999999" color="#FF8D00" flags="print" name="5c371e06-df27-4892-c285-4c32fe74a785" title="Guest" subject="Ellipse" date="D:20200926020154-07'00'" start-time="146.700292" end-time="149.26141583770072" width="8.317724222086639" creationdate="D:20200925163152-07'00'"/><line page="0" rect="239.06000000000003,414.40999999999997,481.48,561.19" color="#25D2D1" flags="print" name="3d432571-ef14-a0f0-7d94-095a145c8653" title="Guest" subject="Line" date="D:20200925163258-07'00'" start-time="441.523966" end-time="481.3905658329155" creationdate="D:20200925163250-07'00'" start="479.48,560.19" end="240.06,416.40999999999997"/><ink page="0" rect="1.3975533862111043,375.76755338621115,552.282446613789,644.9124466137889" color="#E44234" flags="print" name="7027aab8-87f4-095d-6338-52b582cec3a7" title="Guest" subject="Free Hand" date="D:20200926020533-07'00'" start-time="146.700292" end-time="146.700292" width="4.912446613788895" creationdate="D:20200926020504-07'00'"><inklist><gesture>333.61,432.53999999999996;334.31,432.53999999999996;339.92,431.84000000000003;349.03,429.74;374.26,424.13;410.71,414.32;459.77,398.9;475.89,391.89;485.7,388.39;493.41,386.28999999999996;497.61,386.28999999999996;499.02,386.28999999999996;499.02,386.99;499.72,389.78999999999996;502.52,393.3;508.13,398.2;514.43,404.51;522.84,412.91999999999996;531.96,422.73;538.96,431.84000000000003;544.57,442.36;545.97,450.07;546.67,455.66999999999996;546.67,460.58000000000004;546.67,464.78;546.67,466.89;545.27,468.99;545.27,470.39;545.27,474.6;545.27,479.5;545.27,484.40999999999997;543.87,488.61;543.17,492.82;543.17,495.62;542.47,499.13;541.77,501.23;541.77,502.63;541.77,504.73;541.77,507.53999999999996;541.77,510.34000000000003;541.77,513.84;541.77,516.65;541.77,519.45;541.77,522.96;541.77,527.16;543.17,532.77;543.17,536.97;543.87,539.78;544.57,541.1800000000001;544.57,542.58;545.27,543.98;545.27,544.6800000000001;545.97,546.08;545.97,547.49;546.67,549.59;546.67,550.99;546.67,554.49;546.67,557.3;547.37,560.1;547.37,562.2;547.37,565.01;547.37,567.11;545.97,569.21;544.57,571.3199999999999;541.77,574.8199999999999;540.37,576.92;538.26,579.73;536.86,581.13;535.46,582.53;534.06,583.23;533.36,583.93;531.96,583.93;530.55,583.93;528.45,583.93;526.35,583.93;524.25,583.23;522.14,581.83;519.34,580.43;516.54,579.73;511.63,578.32;507.43,577.62;503.92,576.92;499.72,576.22;499.02,576.22;498.31,576.22;498.31,576.22;498.31,576.22;497.61,576.22;496.91,576.22;495.51,576.22;492.01,576.92;490.6,576.92;488.5,577.62;485.7,578.32;483.6,579.02;481.49,579.02;480.09,579.73;478.69,580.43;476.59,581.13;475.89,582.53;473.78,583.23;472.38,584.63;470.98,585.33;470.28,586.73;468.88,588.14;467.48,589.54;466.07,591.64;465.37,593.74;464.67,595.14;464.67,597.25;464.67,597.95;463.97,599.35;463.27,600.75;461.87,603.56;461.17,605.66;460.47,607.76;459.07,609.86;459.07,611.26;458.37,612.67;457.66,614.07;456.96,615.47;456.26,616.87;456.26,617.57;455.56,618.27;455.56,618.27;455.56,618.27;455.56,618.97;454.86,619.67;454.86,620.38;454.16,621.08;454.16,621.78;454.16,623.18;454.16,623.88;453.46,625.28;453.46,626.68;453.46,628.09;453.46,629.49;453.46,629.49;453.46,630.19;453.46,630.89;453.46,631.59;453.46,632.29;453.46,632.99;453.46,632.99;453.46,633.69;452.76,633.69;452.76,632.99;452.76,632.99;452.76,632.99;452.06,632.99;452.06,632.99;452.06,632.99;450.66,632.99;448.55,632.99;445.05,632.99;440.14,632.29;433.13,631.59;427.53,630.89;421.22,630.19;411.41,628.79;406.5,628.79;402.3,628.79;398.79,628.79;398.09,628.79;397.39,628.79;391.78,628.79;385.48,629.49;377.06,630.89;351.83,635.09;335.01,639.3;324.5,640;316.09,640;308.38,640;303.47,640;299.27,640;297.17,640;295.06,640;293.66,640;292.96,640;292.26,640;290.86,640;287.35,640;283.15,640;279.64,640;275.44,640;270.53,640;267.73,640;267.03,640;266.33,640;266.33,640;266.33,640;268.43,640;276.14,638.6;285.25,634.39;291.56,630.89;296.47,626.68;299.27,623.18;299.97,621.08;299.97,617.57;298.57,612.67;293.66,607.76;287.35,602.15;281.05,596.55;276.14,593.74;272.64,590.24;269.13,588.14;265.63,586.03;263.52,584.63;261.42,583.23;258.62,581.13;255.11,579.02;253.01,576.92;251.61,576.22;250.21,574.8199999999999;249.51,574.12;248.81,573.42;248.81,572.72;248.11,572.72;248.11,572.02;248.11,572.02;246,569.21;243.2,566.41;241.1,564.31;239.7,562.9;236.89,560.8;234.09,558.7;230.58,557.3;227.78,555.9;221.47,555.2;215.87,553.79;212.36,553.09;208.86,552.39;204.65,551.69;201.15,551.69;198.34,550.99;194.14,550.99;189.93,550.99;187.13,550.99;183.63,550.99;180.82,550.99;175.22,550.29;171.01,549.59;166.81,548.19;161.2,546.79;155.59,544.6800000000001;150.69,542.58;145.08,539.08;142.28,537.67;138.77,535.5699999999999;137.37,535.5699999999999;133.16,535.5699999999999;127.56,535.5699999999999;121.25,535.5699999999999;107.23,535.5699999999999;98.12,534.87;84.1,533.47;72.19,533.47;65.18,533.47;58.87,533.47;53.27,533.47;51.86,533.47;50.46,533.47;49.06,534.17;47.66,534.17;45.56,534.87;44.15,535.5699999999999;42.75,535.5699999999999;41.35,535.5699999999999;40.65,535.5699999999999;39.95,535.5699999999999;39.25,535.5699999999999;37.85,535.5699999999999;36.44,532.77;34.34,529.96;32.24,527.16;29.44,523.66;27.33,520.85;25.23,518.75;23.13,516.65;21.73,515.25;20.33,513.14;19.62,511.74;19.62,510.34000000000003;18.92,508.24;18.92,506.84000000000003;18.92,505.43;18.92,504.73;18.92,503.33000000000004;18.92,502.63;18.92,502.63;18.92,502.63;19.62,502.63;22.43,502.63;21.03,499.13;18.22,492.82;14.72,485.81;12.62,480.9;9.11,473.9;7.71,468.99;6.31,464.08000000000004;6.31,461.28;6.31,459.88;6.31,457.78;6.31,456.37;7.01,454.27;8.41,452.87;9.11,451.47;9.81,450.77;10.51,450.07;11.21,449.37;12.62,447.96000000000004;13.32,446.56;14.02,445.86;14.72,444.46000000000004;16.12,443.06;18.22,440.25;19.62,438.15;21.73,435.35;23.83,433.25;24.53,431.84000000000003;25.23,430.44;25.93,428.34000000000003;26.63,426.24;27.33,424.13;28.03,422.03;28.74,420.63;32.24,420.63;38.55,419.23;45.56,417.83000000000004;55.37,414.32;69.39,408.01;73.59,405.21000000000004;77.8,402.40999999999997;79.9,400.3;82,398.9;83.4,398.2;85.51,397.5;86.91,396.8;88.31,396.1;89.71,396.1;91.81,395.4;93.92,395.4;95.32,395.4;96.72,394.7;98.12,394.7;100.92,393.3;104.43,391.19;107.93,389.09000000000003;111.44,386.99;114.94,385.59000000000003;116.34,384.89;117.75,384.18;118.45,384.18;124.05,384.18;131.76,384.18;142.28,382.78;149.28,382.08;155.59,381.38;161.9,380.68;165.4,380.68;168.21,380.68;171.01,380.68;171.71,380.68;172.41,380.68;173.81,381.38;175.92,382.78;177.32,384.18;180.12,386.99;183.63,389.78999999999996;187.13,393.3;192.04,396.1;195.54,398.2;201.85,401.71000000000004;203.95,402.40999999999997;206.75,403.11;209.56,403.81;213.06,405.21000000000004;216.57,405.90999999999997;218.67,407.31;222.17,408.71000000000004;224.98,410.12;227.08,410.82;229.18,410.82;230.58,411.52;231.99,412.22;231.99,412.22;231.99,412.22;238.29,415.02;246,418.53;253.01,421.33000000000004;262.12,424.83000000000004;272.64,428.34000000000003;281.75,431.14;292.26,433.95;295.76,435.35;299.27,436.75;301.37,436.75;302.07,437.45;302.77,437.45;302.77,437.45;303.47,438.15;303.47,438.15;304.17,438.15;304.88,438.15;306.28,438.15;306.98,438.15;307.68,437.45;309.08,436.75;309.78,436.05;311.18,435.35;312.59,434.65;313.99,434.65;315.39,433.95;316.79,433.95;318.19,433.25;318.89,433.25;319.59,432.53999999999996;320.29,432.53999999999996;321,432.53999999999996;321.7,432.53999999999996;322.4,432.53999999999996;323.1,432.53999999999996;323.8,432.53999999999996;324.5,432.53999999999996;325.2,432.53999999999996;325.9,432.53999999999996;327.3,432.53999999999996;328,432.53999999999996;329.41,432.53999999999996;330.81,431.84000000000003;331.51,431.84000000000003;332.21,431.84000000000003;332.91,431.14;332.91,431.14;333.61,430.44;333.61,430.44</gesture></inklist></ink><text page="0" rect="324.5,340.57,355.5,371.57" color="#25D2D1" flags="print,nozoom,norotate" name="d6131994-8f67-f07f-a1f3-3bb55ed7181b" title="Guest" subject="Note" date="D:20200926020610-07'00'" start-time="146.700292" end-time="146.700292" creationdate="D:20200926020553-07'00'" icon="Comment" statemodel="Review"/></annots></xfdf>`;
          await annotManager.importAnnotations(demoXfdfString);
          video.updateAnnotationsToTime(0);
        }
        const customContainer = instance.iframeWindow.document.querySelector('.custom-container');
        renderControlsToDOM(instance, customContainer);
      });
    });
  }, [license]);

  async function onFileChange(event) {
    const url = URL.createObjectURL(event.target.files[0]);
    wvLoadVideo(url);
  }

  return (
    <div className="App">
      <input type="file" hidden ref={inputFile} onChange={onFileChange} value=""/>
      <div className="webviewer" ref={viewer}/>
    </div>
  );
};

export default App;
