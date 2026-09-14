import { createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';

import auth from './reducers/AuthReducer';
import ui from './reducers/UiReducer';
import users from './reducers/UserReducer';
import members from './reducers/MemberReducer';
import trainers from './reducers/TrainerReducer';
import plans from './reducers/PlanReducer';
import subscriptions from './reducers/SubscriptionReducer';
import payments from './reducers/PaymentReducer';
import schedules from './reducers/ScheduleReducer';
import timeslots from './reducers/TimeslotReducer';
import trainerTimeslots from './reducers/TrainerTimeslotReducer';
import assignments from './reducers/AssignmentReducer';
import workouts from './reducers/WorkoutReducer';
import exercises from './reducers/ExerciseReducer';
import attendance from './reducers/AttendanceReducer';
import allAttendance from './reducers/AllAttendanceReducer';
import equipment from './reducers/EquipmentReducer';
import equipmentUsage from './reducers/EquipmentUsageReducer';
import rfidTags from './reducers/RfidTagReducer';
import parq from './reducers/parqReducer';

const rootReducer = combineReducers({
  auth,
  ui,
  users,
  members,
  trainers,
  plans,
  subscriptions,
  payments,
  schedules,
  timeslots,
  trainerTimeslots,
  assignments,
  workouts,
  exercises,
  attendance,
  allAttendance,
  equipment,
  equipmentUsage,
  rfidTags,
  parq,
});

const store = createStore(rootReducer, applyMiddleware(thunk));
export default store;
