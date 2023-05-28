import { h, Fragment } from 'preact';
import { route } from 'preact-router';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import { Tabs, TextTab } from '../components/Tabs';
import { useApiHost } from '../api';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import axios from 'axios';
import { useState, useRef, useCallback, useMemo } from 'preact/hooks';
import VideoPlayer from '../components/VideoPlayer';
import { StarRecording } from '../icons/StarRecording';
import { Snapshot } from '../icons/Snapshot';
import { UploadPlus } from '../icons/UploadPlus';
import { Clip } from '../icons/Clip';
import { Zone } from '../icons/Zone';
import { Camera } from '../icons/Camera';
import { Clock } from '../icons/Clock';
import { Delete } from '../icons/Delete';
import { Download } from '../icons/Download';
import Menu, { MenuItem } from '../components/Menu';
import CalendarIcon from '../icons/Calendar';
import Calendar from '../components/Calendar';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import Switch from '../components/Switch';
import MultiSelect from '../components/MultiSelect';
import { formatUnixTimestampToDateTime, getDurationFromTimestamps } from '../utils/dateUtil';
import TimeAgo from '../components/TimeAgo';

const API_LIMIT = 25;
const eventRetrainType = "Accept";

const daysAgo = (num) => {
  let date = new Date();
  date.setDate(date.getDate() - num);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;
};

const monthsAgo = (num) => {
  let date = new Date();
  date.setMonth(date.getMonth() - num);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;
};

export default function Events({ path, ...props }) {
  const apiHost = useApiHost();
  const [searchParams, setSearchParams] = useState({
    before: null,
    after: null,
    cameras: props.cameras ?? 'all',
    labels: props.labels ?? 'all',
    zones: props.zones ?? 'all',
    sub_labels: props.sub_labels ?? 'all',
    favorites: props.favorites ?? 0,
  });
  const [state, setState] = useState({
    showDownloadMenu: false,
    showDatePicker: false,
    showCalendar: false,
    showPlusConfig: false,
    showInspectConfig: false,
    selectedCheckboxes: [],
  });
  const [uploading, setUploading] = useState([]);
  const [viewEvent, setViewEvent] = useState();
  const [selectedCheckboxes, setSelectedCheckboxes] = useState([]);

  
  
  const [eventDetailType, setEventDetailType] = useState('clip');
  const [downloadEvent, setDownloadEvent] = useState({
    id: null,
    has_clip: false,
    has_snapshot: false,
    plus_id: undefined,
    end_time: null,
  });
  const [deleteFavoriteState, setDeleteFavoriteState] = useState({
    deletingFavoriteEventId: null,
    showDeleteFavorite: false,
  });

  const clearSelectedCheckboxes = () => {
    setSelectedCheckboxes([]);
  };

  const logSelectedCheckboxes = () => {
    console.log('Selected checkboxes:', selectedCheckboxes);
    // clearSelectedCheckboxes();
  };

  const eventsFetcher = useCallback((path, params) => {
    params = { ...params, include_thumbnails: 0, limit: API_LIMIT };
    return axios.get(path, { params }).then((res) => res.data);
  }, []);

  const getKey = useCallback(
    (index, prevData) => {
      if (index > 0) {
        const lastDate = prevData[prevData.length - 1].start_time;
        const pagedParams = { ...searchParams, before: lastDate };
        return ['events', pagedParams];
      }

      return ['events', searchParams];
    },
    [searchParams]
  );

  const { data: eventPages, mutate, size, setSize, isValidating } = useSWRInfinite(getKey, eventsFetcher);

  const { data: config } = useSWR('config');

  const { data: allSubLabels } = useSWR(['sub_labels', { split_joined: 1 }]);

  const apiHost2 = 'http://10.0.10.49:5003/' ;


  const filterValues = useMemo(
    () => ({
      cameras: Object.keys(config?.cameras || {}),
      zones: [
        ...Object.values(config?.cameras || {})
          .reduce((memo, camera) => {
            memo = memo.concat(Object.keys(camera?.zones || {}));
            return memo;
          }, [])
          .filter((value, i, self) => self.indexOf(value) === i),
        'None',
      ],
      labels: Object.values(config?.cameras || {})
        .reduce((memo, camera) => {
          memo = memo.concat(camera?.objects?.track || []);
          return memo;
        }, config?.objects?.track || [])
        .filter((value, i, self) => self.indexOf(value) === i),
      sub_labels: (allSubLabels || []).length > 0 ? [...Object.values(allSubLabels), 'None'] : [],
    }),
    [config, allSubLabels]
  );

  const onSave = async (e, eventId, save) => {
    e.stopPropagation();
    let response;
    if (save) {
      response = await axios.post(`events/${eventId}/retain`);
    } else {
      response = await axios.delete(`events/${eventId}/retain`);
    }
    if (response.status === 200) {
      mutate();
    }
  };

  const onDelete = async (e, eventId, saved) => {
    e.stopPropagation();

    if (saved) {
      setDeleteFavoriteState({ deletingFavoriteEventId: eventId, showDeleteFavorite: true });
    } else {
      const response = await axios.delete(`events/${eventId}`);
      if (response.status === 200) {
        mutate();
      }
    }
  };


  const onToggleNamedFilter = (name, item) => {
    let items;

    if (searchParams[name] == 'all') {
      const currentItems = Array.from(filterValues[name]);

      // don't remove all if only one option
      if (currentItems.length > 1) {
        currentItems.splice(currentItems.indexOf(item), 1);
        items = currentItems.join(',');
      } else {
        items = ['all'];
      }
    } else {
      let currentItems = searchParams[name].length > 0 ? searchParams[name].split(',') : [];

      if (currentItems.includes(item)) {
        // don't remove the last item in the filter list
        if (currentItems.length > 1) {
          currentItems.splice(currentItems.indexOf(item), 1);
        }

        items = currentItems.join(',');
      } else if (currentItems.length + 1 == filterValues[name].length) {
        items = ['all'];
      } else {
        currentItems.push(item);
        items = currentItems.join(',');
      }
    }

    onFilter(name, items);
  };

  const datePicker = useRef();

  const downloadButton = useRef();

  const onDownloadClick = (e, event) => {
    e.stopPropagation();
    setDownloadEvent((_prev) => ({
      id: event.id,
      has_clip: event.has_clip,
      has_snapshot: event.has_snapshot,
      plus_id: event.plus_id,
      end_time: event.end_time,
    }));
    downloadButton.current = e.target;
    setState({ ...state, showDownloadMenu: true });
  };

  const handleSelectDateRange = useCallback(
    (dates) => {
      setSearchParams({ ...searchParams, before: dates.before, after: dates.after });
      setState({ ...state, showDatePicker: false });
    },
    [searchParams, setSearchParams, state, setState]
  );

  const onFilter = useCallback(
    (name, value) => {
      const updatedParams = { ...searchParams, [name]: value };
      setSearchParams(updatedParams);
      const queryString = Object.keys(updatedParams)
        .map((key) => {
          if (updatedParams[key] && updatedParams[key] != 'all') {
            return `${key}=${updatedParams[key]}`;
          }
          return null;
        })
        .filter((val) => val)
        .join('&');
      route(`${path}?${queryString}`);
    },
    [path, searchParams, setSearchParams]
  );

  const handleRejectCheckboxChange = (event) => {
    const { value, checked } = event.target;
    setSelectedCheckboxes((prev) =>
      checked ? [...prev, value] : prev.filter((item) => item !== value)
    );
  };

  const handleCheckboxChange = (event) => {
    const { value } = event.target;
    const index = state.selectedCheckboxes.indexOf(value);
  
    if (index === -1) {
      setState((prevState) => ({
        ...prevState,
        selectedCheckboxes: [...prevState.selectedCheckboxes, value]
      }));
    } else {
      setState((prevState) => ({
        ...prevState,
        selectedCheckboxes: prevState.selectedCheckboxes.filter(
          (checkbox) => checkbox !== value
        )
      }));
    }
  };

 
  async function rejectEvent(event_id) {
    console.log('Reject event id:', event_id);  

    try {
      const body = JSON.stringify({
        "event_id": event_id
        
      });

      const response = await fetch('http://10.0.10.49:5003/api/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      });
  
      if (response && response.ok) {
        console.log('Reject event handled successfully');
        return response.ok
      } else if (response) {
        const errorResponse = await response.json();
        console.log('Error:', errorResponse.message);
      } else {
        console.log('Error: No response received');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  
  async function acceptEvent(event_id) {
    console.log('Accept event id:', event_id);  

    try {
      const body = JSON.stringify({
        "event_id": event_id
        
      });

      const response = await fetch('http://10.0.10.49:5003/api/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      });
  
      if (response && response.ok) {
        console.log('Reject event handled successfully');
        return response.ok
      } else if (response) {
        const errorResponse = await response.json();
        console.log('Error:', errorResponse.message);
      } else {
        console.log('Error: No response received');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  
  async function inspectEvent(event_id, checkbox_list) {
    console.log('Inspect event id:', event_id); 
    console.log('checkbox_list:', checkbox_list);  

    try {
      const body = JSON.stringify({
        "event_id": event_id,
        "checkbox_list": checkbox_list
        
      });

      const response = await fetch('http://10.0.10.49:5003/api/inspect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      });
  
      if (response && response.ok) {
        console.log('Reject event handled successfully');
        return response.ok
      } else if (response) {
        const errorResponse = await response.json();
        console.log('Error:', errorResponse.message);
      } else {
        console.log('Error: No response received');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  const isDone = (eventPages?.[eventPages.length - 1]?.length ?? 0) < API_LIMIT;

  // hooks for infinite scroll
  const observer = useRef();
  const lastEventRef = useCallback(
    (node) => {
      if (isValidating) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isDone) {
          setSize(size + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [size, setSize, isValidating, isDone]
  );

  const onSendToPlus = async (id, action, e) => {
    if (e) {
      e.stopPropagation();
    }

    if (uploading.includes(id)) {
      console.log('uploading includes id: ' + id );
      return;
    }

    // if (config.plus.enabled) {
    //   setState({ ...state, showDownloadMenu: false, showPlusConfig: true });
    //   // return;
    // }
    //changes here

    //re-enable after debugging
   setUploading((prev) => [...prev, id]);

    //create local entry for plus event
    // const response = await axios.post(`events/${id}/plus`);

 
    let response;
    let retrainResponse;
    switch (action) {
      case 'reject':
        //create local entry for plus event
        console.log('Case Reject:  ' + id );

        //renable after debug
        response = await axios.post(`events/${id}/plus`);

        try {
         const reject = await rejectEvent(id)
         console.log("reject respones " + reject)
        } catch (error) {
          console.error('An error occurred while making the POST request:', error);
        }

        // Reject - no user input
        
        break;

      case 'accept':
        //create local entry for plus event
        console.log('Case Accept:  ' + id );
        response = await axios.post(`events/${id}/plus`);
        // Accept - no user input
        try {
          const accept = await acceptEvent(id)
          console.log("reject respones " + accept)
         } catch (error) {
           console.error('An error occurred while making the POST request:', error);
         }
        break;

      case 'inspect':
        //create local entry for plus event
        console.log('Case Inspect:  ' + id );
        setState({ ...state, showPlusConfig: false, showInspectConfig: false })
        response = await axios.post(`events/${id}/plus`);
        // Inspect - user input
        // use selected checkboxes
        try {
          const inspect = await inspectEvent(id, selectedCheckboxes)
          console.log("inspect respones " + inspect)
         } catch (error) {
           console.error('An error occurred while making the POST request:', error);
         }

        break;


      default:
        console.error('Invalid action');
        return;
    }
    setState({ ...state, showDownloadMenu: false, showPlusConfig: false, showInspectConfig: false });

    //clear checkbox data
    clearSelectedCheckboxes();
   if (response.status === 200) {
      mutate(
        (pages) =>
          pages.map((page) =>
            page.map((event) => {
              if (event.id === id) {
                console.log('uploading includes plus id: ' + id );
                return { ...event, plus_id: response.data.plus_id };
              }
              return event;
            })
          ),
        false
      );
    }

    //change upload endpoint based on button press

      //reject - no user input

      //accept - no user input

      //inspect - user input 

        //use selected check boxes
  
      //dismiss - no user input
      
    


    //use post to backend server

    //clear checkboxes
    



    
    setUploading((prev) => prev.filter((i) => i !== id));

    if (state.showDownloadMenu && downloadEvent.id === id) {
      setState({ ...state, showDownloadMenu: false });
    }
  };

  const handleEventDetailTabChange = (index) => {
    setEventDetailType(index == 0 ? 'clip' : 'image');
  };

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="space-y-4 p-2 px-4 w-full">
      <Heading>Events</Heading>
      <div className="flex flex-wrap gap-2 items-center">
        <MultiSelect
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          title="Cameras"
          options={filterValues.cameras}
          selection={searchParams.cameras}
          onToggle={(item) => onToggleNamedFilter('cameras', item)}
          onShowAll={() => onFilter('cameras', ['all'])}
          onSelectSingle={(item) => onFilter('cameras', item)}
        />
        <MultiSelect
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          title="Labels"
          options={filterValues.labels}
          selection={searchParams.labels}
          onToggle={(item) => onToggleNamedFilter('labels', item)}
          onShowAll={() => onFilter('labels', ['all'])}
          onSelectSingle={(item) => onFilter('labels', item)}
        />
        <MultiSelect
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          title="Zones"
          options={filterValues.zones}
          selection={searchParams.zones}
          onToggle={(item) => onToggleNamedFilter('zones', item)}
          onShowAll={() => onFilter('zones', ['all'])}
          onSelectSingle={(item) => onFilter('zones', item)}
        />
        {filterValues.sub_labels.length > 0 && (
          <MultiSelect
            className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
            title="Sub Labels"
            options={filterValues.sub_labels}
            selection={searchParams.sub_labels}
            onToggle={(item) => onToggleNamedFilter('sub_labels', item)}
            onShowAll={() => onFilter('sub_labels', ['all'])}
            onSelectSingle={(item) => onFilter('sub_labels', item)}
          />
        )}

        <StarRecording
          className="h-10 w-10 text-yellow-300 cursor-pointer ml-auto"
          onClick={() => onFilter('favorites', searchParams.favorites ? 0 : 1)}
          fill={searchParams.favorites == 1 ? 'currentColor' : 'none'}
        />

        <div ref={datePicker} className="ml-right">
          <CalendarIcon
            className="h-8 w-8 cursor-pointer"
            onClick={() => setState({ ...state, showDatePicker: true })}
          />
        </div>
      </div>
      {state.showDownloadMenu && (
        <Menu onDismiss={() => setState({ ...state, showDownloadMenu: false })} relativeTo={downloadButton}>
          {downloadEvent.has_snapshot && (
            <MenuItem
              icon={Snapshot}
              label="Download Snapshot"
              value="snapshot"
              href={`${apiHost}/api/events/${downloadEvent.id}/snapshot.jpg?download=true`}
              download
            />
          )}
          {downloadEvent.has_clip && (
            <MenuItem
              icon={Clip}
              label="Download Clip"
              value="clip"
              href={`${apiHost}/api/events/${downloadEvent.id}/clip.mp4?download=true`}
              download
            />
          )}
          {(downloadEvent.end_time && downloadEvent.has_snapshot && !downloadEvent.plus_id) && (
            <MenuItem
              icon={UploadPlus}
              label={uploading.includes(downloadEvent.id) ? 'Uploading...' : 'Apply RAID'}
              value="plus"
              // onSelect={() => onSendToPlus(downloadEvent.id)}
              onSelect={(e) => setState({ ...state, showDownloadMenu: false, showPlusConfig: true, })}
            />
          )}
          {downloadEvent.plus_id && (
            <MenuItem
              icon={UploadPlus}
              label={'Apply RAID'}
              value="plus"
              onSelect={() => setState({ ...state, showDownloadMenu: false })}
            />
          )}
        </Menu>
      )}
      {state.showDatePicker && (
        <Menu
          className="rounded-t-none"
          onDismiss={() => setState({ ...state, setShowDatePicker: false })}
          relativeTo={datePicker}
        >
          <MenuItem label="All" value={{ before: null, after: null }} onSelect={handleSelectDateRange} />
          <MenuItem label="Today" value={{ before: null, after: daysAgo(0) }} onSelect={handleSelectDateRange} />
          <MenuItem
            label="Yesterday"
            value={{ before: daysAgo(0), after: daysAgo(1) }}
            onSelect={handleSelectDateRange}
          />
          <MenuItem label="Last 7 Days" value={{ before: null, after: daysAgo(7) }} onSelect={handleSelectDateRange} />
          <MenuItem label="This Month" value={{ before: null, after: monthsAgo(0) }} onSelect={handleSelectDateRange} />
          <MenuItem
            label="Last Month"
            value={{ before: monthsAgo(0), after: monthsAgo(1) }}
            onSelect={handleSelectDateRange}
          />
          <MenuItem
            label="Custom Range"
            value="custom"
            onSelect={() => {
              setState({ ...state, showCalendar: true, showDatePicker: false });
            }}
          />
        </Menu>
      )}
      {state.showCalendar && (
        <Menu
          className="rounded-t-none"
          onDismiss={() => setState({ ...state, showCalendar: false })}
          relativeTo={datePicker}
        >
          <Calendar
            onChange={handleSelectDateRange}
            dateRange={{ before: searchParams.before * 1000 || null, after: searchParams.after * 1000 || null }}
            close={() => setState({ ...state, showCalendar: false })}
          />
        </Menu>
      )}
      {state.showPlusConfig && (
        <Dialog>
          <div className="p-4">
            <Heading size="lg">Gotcha RAID (Reject, Accept, Inspect, Dismiss) Account</Heading>
            <p className="mb-2">In order to submit footage to Gotcha RAID, please select one of the following.</p>
            <a
              className="text-blue-500 hover:underline"
              href="https://gotcha.camera"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://gotcha.camera
            </a>
          </div>
          <div className="p-2 flex justify-start flex-row-center">
          <Button color="red" className="ml-2" onClick={(e) =>  {
            setState({ ...state, showPlusConfig: false })
            onSendToPlus(viewEvent, "reject", e);
            
            }} type="outlined">
              Reject
            </Button>
            <Button color="green" className="ml-2" onClick={(e) => {
            setState({ ...state, showPlusConfig: false })
            onSendToPlus(viewEvent, "accept", e);
            
            }} type="outlined">
              Accept
            </Button>
            <Button color="gray" className="ml-2" onClick={() => setState({ ...state, showInspectConfig: true})} type="outlined">
              Inspect
            </Button>
            <Button className="ml-2" onClick={() => setState({ ...state, showPlusConfig: false })} type="outlined">
              Dismiss
            </Button>           

          </div>
        </Dialog>
      )} 
      {state.showInspectConfig && (
        <Dialog>
        <div className="p-4">
          <Heading size="lg">Please select which object(s) were in the event</Heading>
          <p className="mb-2">You can choose multiple objects, as to why this was a false positive event.</p>
        </div>
        {/* Add the rest of the checkboxes with their unique id and value attributes */}
        {/* ... */}
        <div class="flex items-center pl-4 border border-gray-200 rounded dark:border-gray-700">
          <input
            id="bordered-checkbox-5" type="checkbox" value="Person"name="bordered-checkbox" onChange={handleRejectCheckboxChange}
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label for="bordered-checkbox-5" class="w-full py-4 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Person</label>
        </div>
        <div class="flex items-center pl-4 border border-gray-200 rounded dark:border-gray-700">
          <input
            id="bordered-checkbox-6" type="checkbox" value="Animal"name="bordered-checkbox" onChange={handleRejectCheckboxChange}
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label for="bordered-checkbox-6" class="w-full py-4 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Animal</label>
        </div>
        <div class="flex items-center pl-4 border border-gray-200 rounded dark:border-gray-700">
          <input
            id="bordered-checkbox-5" type="checkbox" value="Vehicle"name="bordered-checkbox" onChange={handleRejectCheckboxChange}
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label for="bordered-checkbox-5" class="w-full py-4 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Vehicle</label>
        </div>
        <div class="flex items-center pl-4 border border-gray-200 rounded dark:border-gray-700">
          <input
            id="bordered-checkbox-6" type="checkbox" value="Nothing"name="bordered-checkbox" onChange={handleRejectCheckboxChange}
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label for="bordered-checkbox-6" class="w-full py-4 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Nothing</label>
        </div>
        <div className="flex justify-between w-full my-4"> 
            <Button
              type="outlined"
              className="mr-2"
              onClick={() => {
                console.log('Selected cancel for event: ' + viewEvent);
                //console.log('Selected event:', state.eventId);
                clearSelectedCheckboxes();
                setState({ ...state, showInspectConfig: false })

              }}
              
            >
              Cancel
            </Button>
            <Button
              color="green"
              className="mr-2"
              disabled={selectedCheckboxes.length === 0}
              onClick={(e) => {
                console.log('Selected checkboxes:');
                console.log('Selected event: ' +  viewEvent);
                // logSelectedCheckboxes();
                // clearSelectedCheckboxes();
                
                
                onSendToPlus(viewEvent, "inspect", e)
                setState({ ...state, showPlusConfig: false, showInspectConfig: false })


                
              }}           
              
            >
              Accept
            </Button>
          </div>
      </Dialog>
      )}
      {deleteFavoriteState.showDeleteFavorite && (
        <Dialog>
          <div className="p-4">
            <Heading size="lg">Delete Saved Event?</Heading>
            <p className="mb-2">Confirm deletion of saved event.</p>
          </div>
          <div className="p-2 flex justify-start flex-row-reverse space-x-2">
            <Button
              className="ml-2"
              color="red"
              onClick={(e) => {
                setDeleteFavoriteState({ ...state, showDeleteFavorite: false });
                onDelete(e, deleteFavoriteState.deletingFavoriteEventId, false);
              }}
              type="text"
            >
              Delete
            </Button>
          </div>
        </Dialog>
      )}
      <div className="space-y-2">
        {eventPages ? (
          eventPages.map((page, i) => {
            const lastPage = eventPages.length === i + 1;
            return page.map((event, j) => {
              const lastEvent = lastPage && page.length === j + 1;
              return (
                <Fragment key={event.id}>
                  <div
                    ref={lastEvent ? lastEventRef : false}
                    className="flex bg-slate-100 dark:bg-slate-800 rounded cursor-pointer min-w-[330px]"
                    onClick={() => (viewEvent === event.id ? setViewEvent(null) : setViewEvent(event.id))}
                  >
                    <div
                      className="relative rounded-l flex-initial min-w-[125px] h-[125px] bg-contain bg-no-repeat bg-center"
                      style={{
                        'background-image': `url(${apiHost}/api/events/${event.id}/thumbnail.jpg)`,
                      }}
                    >
                      <StarRecording
                        className="h-6 w-6 text-yellow-300 absolute top-1 right-1 cursor-pointer"
                        onClick={(e) => onSave(e, event.id, !event.retain_indefinitely)}
                        fill={event.retain_indefinitely ? 'currentColor' : 'none'}
                      />
                      {event.end_time ? null : (
                        <div className="bg-slate-300 dark:bg-slate-700 absolute bottom-0 text-center w-full uppercase text-sm rounded-bl">
                          In progress
                        </div>
                      )}
                    </div>
                    <div className="m-2 flex grow">
                      <div className="flex flex-col grow">
                        <div className="capitalize text-lg font-bold">
                          {event.sub_label
                            ? `${event.label.replaceAll('_', ' ')}: ${event.sub_label.replaceAll('_', ' ')}`
                            : event.label.replaceAll('_', ' ')}
                          ({(event.top_score * 100).toFixed(0)}%)
                        </div>
                        <div className="text-sm flex">
                          <Clock className="h-5 w-5 mr-2 inline" />
                          {formatUnixTimestampToDateTime(event.start_time, { ...config.ui })}
                          <div className="hidden md:inline">
                            <span className="m-1">-</span>
                            <TimeAgo time={event.start_time * 1000} dense />
                          </div>
                          <div className="hidden md:inline">
                            <span className="m-1" />( {getDurationFromTimestamps(event.start_time, event.end_time)} )
                          </div>
                        </div>
                        <div className="capitalize text-sm flex align-center mt-1">
                          <Camera className="h-5 w-5 mr-2 inline" />
                          {event.camera.replaceAll('_', ' ')}
                        </div>
                        <div className="capitalize  text-sm flex align-center">
                          <Zone className="w-5 h-5 mr-2 inline" />
                          {event.zones.join(', ').replaceAll('_', ' ')}
                        </div>
                      </div>
                      <div class="hidden sm:flex flex-col justify-end mr-2">
                        {(event.end_time && event.has_snapshot) && (
                          <Fragment>
                            {event.plus_id ? (
                              <div className="uppercase text-xs">Applied Raid</div>
                            ) : (
                              <Button
                                color="gray"
                                disabled={uploading.includes(event.id)}
                                //onClick={(e) => onSendToPlus(event.id, e)}
                                onClick={(e) => setState({ ...state, showDownloadMenu: false, showPlusConfig: true })}
                              >
                                {uploading.includes(event.id) ? 'Uploading...' : 'RAID'}
                              </Button>
                            )}
                          </Fragment>
                        )}
                      </div>
                      <div class="flex flex-col">
                        <Delete
                          className="h-6 w-6 cursor-pointer"
                          stroke="#f87171"
                          onClick={(e) => onDelete(e, event.id, event.retain_indefinitely)}
                        />

                        <Download
                          className="h-6 w-6 mt-auto"
                          stroke={event.has_clip || event.has_snapshot ? '#3b82f6' : '#cbd5e1'}
                          onClick={(e) => onDownloadClick(e, event)}
                        />
                      </div>
                    </div>
                  </div>
                  {viewEvent !== event.id ? null : (
                    <div className="space-y-4">
                      <div className="mx-auto max-w-7xl">
                        <div className="flex justify-center w-full py-2">
                          <Tabs
                            selectedIndex={event.has_clip && eventDetailType == 'clip' ? 0 : 1}
                            onChange={handleEventDetailTabChange}
                            className="justify"
                          >
                            <TextTab text="Clip" disabled={!event.has_clip} />
                            <TextTab text={event.has_snapshot ? 'Snapshot' : 'Thumbnail'} />
                          </Tabs>
                        </div>

                        <div>
                          {eventDetailType == 'clip' && event.has_clip ? (
                            <VideoPlayer
                              options={{
                                preload: 'auto',
                                autoplay: true,
                                sources: [
                                  {
                                    src: `${apiHost}vod/event/${event.id}/master.m3u8`,
                                    type: 'application/vnd.apple.mpegurl',
                                  },
                                ],
                              }}
                              seekOptions={{ forward: 10, backward: 5 }}
                              onReady={() => {}}
                            />
                          ) : null}

                          {eventDetailType == 'image' || !event.has_clip ? (
                            <div className="flex justify-center">
                              <img
                                className="flex-grow-0"
                                src={
                                  event.has_snapshot
                                    ? `${apiHost}/api/events/${event.id}/snapshot.jpg`
                                    : `${apiHost}/api/events/${event.id}/thumbnail.jpg`
                                }
                                alt={`${event.label} at ${(event.top_score * 100).toFixed(0)}% confidence`}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            });
          })
        ) : (
          <ActivityIndicator />
        )}
      </div>
      <div>{isDone ? null : <ActivityIndicator />}</div>
    </div>
  );
}
