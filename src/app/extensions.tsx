import React from 'react';
import {ExtensionsScreen} from '../ExtensionsScreen';
import { nexaGoBack } from '../NexaNavKeys';
export default function Extensions(){return <ExtensionsScreen onBack={()=>nexaGoBack()} />;}
