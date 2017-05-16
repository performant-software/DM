/* global require */
const { applyMiddleware, createStore, compose } = require("redux");
const { logger } = require("redux-logger");
const { createActions, handleActions } = require("redux-actions");

const actions = createActions(
    "PROJECT_SELECTED",
    "RESOURCES_CHANGED",
    "RESOURCE_SELECTED"
);

const reducer = handleActions({

    [actions.projectSelected]: (state, action) => ({
        ...state,
        project: action.payload.uri,
        resourceSelected: undefined
    }),

    [actions.resourcesChanged]: (state, action) => ({
        ...state,
        resources: [...Object.keys(action.payload.containers)].sort()
    }),

    [actions.resourceSelected]: (state, action) => ({
        ...state,
        resourceSelected: action.payload
    })

}, {
    project: undefined,
    resources: [],
    resourceSelected: undefined
});

const store = createStore(reducer, applyMiddleware(logger));
window.DM = Object.assign(window.DM || {}, { store });

const dispatch = store.dispatch.bind(store);
Object.keys(actions).forEach(k => window.DM[k] = compose(dispatch, actions[k]));
