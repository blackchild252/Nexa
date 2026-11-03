import React from 'react';
import {ExtensionDeveloperScreen} from '../ExtensionDeveloperScreen';
import { nexaGoBack } from '../NexaNavKeys';
export default function Developer(){return <ExtensionDeveloperScreen onBack={()=>nexaGoBack()} />;}
