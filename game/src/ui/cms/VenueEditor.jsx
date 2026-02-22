/**
 * VenueEditor.jsx — Venue/Map management tab in MasterCMS
 *
 * Delegates to RoomManager for the full 3-panel room management experience
 * with map editor integration. This unifies the "Venues / Map" tab in MasterCMS
 * and the "Rooms" tab in ContentStudio into one shared component.
 */

import React from 'react';
import RoomManager from './RoomManager.jsx';

export default function VenueEditor() {
    return <RoomManager onClose={() => {}} />;
}
