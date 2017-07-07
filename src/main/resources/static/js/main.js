/* global require */
const { applyMiddleware, createStore, compose } = require("redux");
const { logger } = require("redux-logger");
const { createActions, handleActions } = require("redux-actions");

const actions = createActions(
    "USER_LOGGED_IN",
    "PROJECT_SELECTED",
    "RESOURCES_CHANGED",
    "RESOURCE_SELECTED",
    "DATA_SYNCHRONIZED"
);

const reducer = handleActions({

    [actions.userLoggedIn]: (state, action) => ({
        ...state,
        user: action.payload
    }),

    [actions.projectSelected]: (state, action) => ({
        ...state,
        project: action.payload,
        resourceSelected: undefined
    }),

    [actions.resourcesChanged]: (state, action) => ({
        ...state,
        resources: [...Object.keys(action.payload.containers)].sort()
    }),

    [actions.resourceSelected]: (state, action) => ({
        ...state,
        resourceSelected: action.payload
    }),

    [actions.dataSynchronized]: (state, action) => ({
        ...state,
        transactions: state.transactions.concat([
            action.payload
        ]).slice(-10)
    })

}, {
    user: undefined,
    project: undefined,
    resources: [],
    resourceSelected: undefined,
    transactions: []
});

const store = createStore(reducer, applyMiddleware(logger));
window.DM = Object.assign(window.DM || {}, { store });

const dispatch = store.dispatch.bind(store);
Object.keys(actions).forEach(k => window.DM[k] = compose(dispatch, actions[k]));
