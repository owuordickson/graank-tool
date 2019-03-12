# -*- coding: utf-8 -*-
"""
Created on Fri Jun 12 14:31:16 2015

@author: Olivier + modif MJL+MR 140316

Modified on Tue Oct 23 2018 by Dickson Owuor

Description: This code (originally) correlates gradual patterns using concordant pairs
                We added a functionality that allows for retrieval of time lags from concordant
                indices, approximation using a fuzzy membership function
                T-GRAANK - denotes Temporal GRAANK (GRAdual rANKing) and User interface
Usage:
    $python t_graank.py -f DATASET.csv -c refColumn -s minSupport  -r minRepresentativity
    $python t_graank.py -f test.csv -c 0 -s 0.5 -r 0.5

"""

import sys
import numpy as np
import gc
import skfuzzy as fuzzy
import csv
from dateutil.parser import parse
import time
import itertools as it
from collections import Iterable


# --------------------------- Data Transform -----------------------

class DataTransform:

    def __init__(self, filename, ref_item, min_rep):
        # 1. Test dataset
        cols, data = DataTransform.test_dataset(filename)

        if cols:
            #print("Dataset Ok")
            self.time_ok = True
            self.time_cols = cols
            self.ref_item = ref_item
            self.data = data
            self.max_step = self.get_max_step(min_rep)
            self.multi_data = self.split_dataset()
        else:
            print("Dataset Error")
            self.time_ok = False
            self.time_cols = []
            raise Exception('No date-time data found')

    def split_dataset(self):
        # NB: Creates an (array) item for each column
        # NB: ignore first row (titles) and date-time columns
        # 1. get no. of columns (ignore date-time columns)
        no_columns = (len(self.data[0]) - len(self.time_cols))

        # 2. Create arrays for each gradual column item
        multi_data = [None] * no_columns
        i = 0
        for c in range(len(self.data[0])):
            multi_data[i] = []
            for r in range(1, len(self.data)):  # ignore title row
                if c in self.time_cols:
                    continue  # skip columns with time
                else:
                    item = self.data[r][c]
                    multi_data[i].append(item)
            if not (c in self.time_cols):
                i += 1
        return multi_data

    def transform_data(self, step):
        # NB: Restructure dataset based on reference item
        if self.time_ok:
            # 1. Calculate time difference using step
            ok, time_diffs = self.get_time_diffs(step)
            if not ok:
                msg = "Error: Time in row " + str(time_diffs[0]) + " or row " + str(time_diffs[1]) + " is not valid."
                raise Exception(msg)
            else:
                ref_column = self.ref_item
                # 1. Load all the titles
                first_row = self.data[0]

                # 2. Creating titles without time column
                no_columns = (len(first_row) - len(self.time_cols))
                title_row = [None] * no_columns
                i = 0
                for c in range(len(first_row)):
                    if c in self.time_cols:
                        continue
                    title_row[i] = first_row[c]
                    i += 1

                ref_name = str(title_row[ref_column])
                title_row[ref_column] = "<strong>" +ref_name + "**</strong>"
                new_dataset = [title_row]

                # 3. Split the original dataset into gradual items
                gradual_items = self.multi_data

                # 4. Transform the data using (row) n+step
                for j in range(len(self.data)):
                    ref_item = gradual_items[ref_column]

                    if j < (len(ref_item) - step):
                        init_array = [ref_item[j]]

                        for i in range(len(gradual_items)):
                            if i < len(gradual_items) and i != ref_column:
                                gradual_item = gradual_items[i];
                                temp = [gradual_item[j + step]]
                                temp_array = np.append(init_array, temp, axis=0)
                                init_array = temp_array
                        new_dataset.append(list(init_array))
                return new_dataset, time_diffs;
        else:
            msg = "Fatal Error: Time format in column could not be processed"
            raise Exception(msg)

    def get_representativity(self, step):
        # 1. Get all rows minus the title row
        all_rows = (len(self.data) - 1)

        # 2. Get selected rows
        incl_rows = (all_rows - step)

        # 3. Calculate representativity
        if incl_rows > 0:
            rep = (incl_rows / float(all_rows))
            info = {"Transformation": "n+"+str(step), "Representativity": rep}
            return True, info
        else:
            return False, "Representativity is 0%"

    def get_max_step(self, minrep):
        # 1. count the number of steps each time comparing the
        # calculated representativity with minimum representativity
        for i in range(len(self.data)):
            check, info = self.get_representativity(i + 1)
            if check:
                rep = info['Representativity']
                if rep < minrep:
                    return i
            else:
                return 0

    def get_time_diffs(self, step):
        time_diffs = []
        for i in range(1, len(self.data)):
            if i < (len(self.data) - step):
                # temp_1 = self.data[i][0]
                # temp_2 = self.data[i + step][0]
                temp_1 = temp_2 = ""
                for col in self.time_cols:
                    temp_1 += " "+str(self.data[i][int(col)])
                    temp_2 += " "+str(self.data[i + step][int(col)])

                stamp_1 = DataTransform.get_timestamp(temp_1)
                stamp_2 = DataTransform.get_timestamp(temp_2)

                if (not stamp_1) or (not stamp_2):
                    return False, [i + 1, i + step + 1]

                time_diff = (stamp_2 - stamp_1)
                time_diffs.append(time_diff)
        #print("Time Diff: " + str(time_diff))
        return True, time_diffs

    @staticmethod
    def test_dataset(filename):
        # NB: test the dataset attributes: time|item_1|item_2|...|item_n
        # return true and (list) dataset if it is ok
        # 1. retrieve dataset from file
        with open(filename, 'rU') as f:
            dialect = csv.Sniffer().sniff(f.read(1024), delimiters=";,' '\t")
            f.seek(0)
            reader = csv.reader(f, dialect)
            temp = list(reader)
            f.close()

        # 2. Retrieve time and their columns
        time_cols = list()
        for i in range(len(temp[1])):  # check every column for time format
            row_data = str(temp[1][i])
            try:
                time_ok, t_stamp = DataTransform.test_time(row_data)
                if time_ok:
                    time_cols.append(i)
            except ValueError:
                continue

        if time_cols:
            return time_cols, temp
        else:
            return False, temp

    @staticmethod
    def get_timestamp(time_data):
        try:
            ok, stamp = DataTransform.test_time(time_data)
            if ok:
                return stamp
            else:
                return False
        except ValueError:
            return False

    @staticmethod
    def test_time(date_str):
        # add all the possible formats
        try:
            if type(int(date_str)):
                return False, False
        except ValueError:
            try:
                if type(float(date_str)):
                    return False, False
            except ValueError:
                try:
                    date_time = parse(date_str)
                    t_stamp = time.mktime(date_time.timetuple())
                    return True, t_stamp
                except ValueError:
                    raise ValueError('no valid date-time format found')


# ------------------- Fuzzy Temporal -----------------------------

def init_fuzzy_support(test_members, all_members, minsup):
    boundaries, extremes = get_membership_boundaries(all_members)
    value, sup = approximate_fuzzy_support(minsup, test_members, boundaries, extremes)
    return value, sup


def get_membership_boundaries(members):
    # 1. Sort the members in ascending order
    members.sort()

    # 2. Get the boundaries of membership function
    min = np.min(members)
    q_1 = np.percentile(members, 25)  # Quartile 1
    med = np.percentile(members, 50)
    q_3 = np.percentile(members, 75)
    max = np.max(members)
    boundaries = [q_1, med, q_3]
    extremes = [min, max]

    return boundaries,extremes


def approximate_fuzzy_support(minsup, timelags, orig_boundaries, extremes):
    gap = (0.1*int(orig_boundaries[1]))
    sup = sup1 = 0
    slide_left = slide_right = expand = False
    sample = np.percentile(timelags, 50)

    a = orig_boundaries[0]
    b = b1 = orig_boundaries[1]
    c = orig_boundaries[2]
    min_a = extremes[0]
    max_c = extremes[1]
    boundaries = np.array(orig_boundaries)
    time_lags = np.array(timelags)

    while sup <= minsup:

        if sup > sup1:
            sup1 = sup
            b1 = b

        # Calculate membership of frequent path
        memberships = fuzzy.membership.trimf(time_lags, boundaries)

        # Calculate support
        sup = calculate_support(memberships)

        if sup >= minsup:
            value = get_time_format(b)
            return value, sup
        else:
            if not slide_left:
                # 7. Slide to the left to change boundaries
                # if extreme is reached - then slide right
                if sample <= b:
                #if min_a >= b:
                    a = a - gap
                    b = b - gap
                    c = c - gap
                    boundaries = np.array([a, b, c])
                else:
                    slide_left = True
            elif not slide_right:
                # 8. Slide to the right to change boundaries
                # if extreme is reached - then slide right
                if sample >= b:
                #if max_c <= b:
                    a = a + gap
                    b = b + gap
                    c = c + gap
                    boundaries = np.array([a, b, c])
                else:
                    slide_right = True
            elif not expand:
                # 9. Expand quartiles and repeat 5. and 6.
                a = min_a
                b = orig_boundaries[1]
                c = max_c
                boundaries = np.array([a, b, c])
                slide_left = slide_right = False
                expand = True
            else:
                value = get_time_format(b1)
                return value, False


def calculate_support(memberships):
    support = 0
    if len(memberships) > 0:
        sup_count = 0
        total = len(memberships)
        for member in memberships:
            if float(member) > 0:
                sup_count = sup_count + 1
        support = sup_count / total
    return support


def get_time_format(value):
    if value < 0:
        sign = "-"
    else:
        sign = "+"
    p_value, p_type = round_time(abs(value))
    p_format = [sign,p_value,p_type]
    return p_format


def round_time(seconds):
    years = seconds/3.154e+7
    months = seconds/2.628e+6
    weeks = seconds/604800
    days = seconds/86400
    hours = seconds/3600
    minutes = seconds/60

    if int(years) <= 0:
        if int(months) <= 0:
            if int(weeks) <= 0:
                if int(days) <= 0:
                    if int(hours) <= 0:
                        if int(minutes) <= 0:
                            return seconds,"seconds"
                        else:
                            return minutes,"minutes"
                    else:
                        return hours,"hours"
                else:
                    return days,"days"
            else:
                return weeks,"weeks"
        else:
            return months,"months"
    else:
        return years,"years"

# ------------------- Data Transform ------------------------------



# ------------------- MBDLL Border ---------------------------------

def mbdll_border(dataset_1, dataset_2):
    ep_list = list()
    #if set(dataset_1).isdisjoint(set(dataset_2)):
    count_d2 = get_border_length(dataset_2)
    if count_d2 <= 1:
        temp_list = get_ep_border(dataset_2, dataset_1)
        if temp_list:
            ep_list.append(temp_list)
    else:
        for d2_item in dataset_2:  # starts at 1 - only the maximal items
            temp_list = get_ep_border(d2_item, dataset_1)
            if temp_list:
                ep_list.append(temp_list)
    return ep_list
    #else:
    #    return ep_list


def get_intersections(item_1, init_list):
    items = list()
    #print(init_list)
    #print(item_1)
    count_c = get_border_length(init_list)
    if count_c <= 1:
        C = set(init_list)
        if C.issuperset(set(item_1)):  # it means item is in both data-sets hence not emerging
            return items
        else:
            diff = C.intersection(set(item_1))
            items.append(list(diff))
    else:
        for item in init_list:
            C = set(item)
            if C.issuperset(set(item_1)):  # it means item is in both data-sets
                return items
            else:
                diff = C.intersection(set(item_1))
                if diff:
                    items.append(list(diff))
    return items


def get_ep_border(d2_item, d1_list):
    ep = list()
    r_list = get_intersections(d2_item, d1_list)
    if not is_list_empty(r_list):
        u_list = list(d2_item)
        L, U, R = border_diff(u_list, r_list)
        ep = list(L)
    return ep


# ----------------------- Border Diff ------------------------------

def border_diff(u_list, r_list):

    # U is the Universe set
    # R is the Right (Maximal/left-rooted) set
    # L = U - R (difference of borders U and R)
    U = gen_set(list(u_list), select=1)
    R = gen_set(list(r_list), select=1)
    L = set()
    l_list = list()

    count_u = get_border_length(u_list)  # testing if set item is a single array item

    if count_u < 1:
        l_list.append(get_border_diff(u_list, r_list))
    else:
        [l_list.append(get_border_diff(u_item, r_list)) for u_item in u_list]

    if not is_list_empty(l_list):
        L = gen_set(l_list, u_list, select=2)
    return L, U, R


def get_border_diff(a, b_list):
    border_list = tuple()
    count_b = get_border_length(b_list)
    if count_b < 1:
        diff = set(a).difference(set(b_list))  # (for sets) same as diff = A - B
        temp_list = expand_border(border_list, list(diff))
        border_list = remove_non_minimal(temp_list)
    else:
        for b_item in b_list:
            try:
                set_B = set(b_item)
            except TypeError:
                set_B = set({b_item})
            diff = set(a).difference(set_B)
            temp_list = expand_border(border_list, list(diff))  # expands/updates every border item by adding diff
            border_list = remove_non_minimal(temp_list)  # removes non-minimal items from expanded list
    return border_list


def expand_border(init_list, item):
    temp = it.product(init_list, item)
    expanded_list = list()

    if not init_list:
        [expanded_list.append(a) for a in item]
    elif set(init_list) == set(item):
        expanded_list = init_list
    else:
        [expanded_list.append(tuple(combine_items(list(a)))) for a in temp]

    expanded_list.sort()
    return expanded_list


def remove_non_minimal(init_list):
    item_set = tuple()
    for item_i in init_list:
        for item_j in init_list:
            if isinstance(item_i, Iterable) and isinstance(item_j, Iterable) \
                    and not isinstance(item_i, str) and not isinstance(item_j, str):
                set_i = tuple(item_i)
                set_j = tuple(item_j)
            else:
                return init_list

            # removes those elements that are non-minimal
            # -------------------------------------------
            # Maximal item-sets: biggest set that has no superset
            # Minimal item-sets: smallest set than any other (may or may not be a subset of another set)
            # non-minimal is therefore neither maximal nor minimal
            if (not set(set_i).issubset(set(set_j))) and (not set(set_i).issuperset(set(set_j))) \
                    and (set(set_i) == set(set_j)):
                # the two sets are non-minimal
                continue
            elif not set(set_i).isdisjoint(set(set_j)):  # the two sets are not the same
                continue
            else:
                s = set(set_i)
                if len(tuple(s)) <= 1:
                    item_set = item_set + (tuple(s))
                else:
                    item_set = item_set + (tuple(s),)
    return tuple(set(item_set))


def gen_set(in_list, r_border=(), select=0):
    i_set = tuple()
    for i in range(len(in_list)):

        if isinstance(in_list[i], Iterable) and isinstance(in_list[i], Iterable) \
                and not isinstance(in_list[i], str) and not isinstance(in_list[i], str):
            item_i = tuple(in_list[i])
        else:
            item_i = in_list

        if i > 0 and item_i == in_list:  # takes care of single item lists(or sets)
            break

        S = set(item_i)
        if len(tuple(S)) <= 1:
            i_set = i_set + (tuple(S))
        else:
            i_set = i_set + (tuple(S),)

    if select == 1:            # left-rooted border
        border = (i_set, ())
        return set(border)
    elif select == 2:           # non-rooted border
        border = ((tuple(r_border),) + i_set)
        return set(border)
    else:                      # normal set
        return set(i_set)


def get_border_length(item_list):
    n = 0
    for item in item_list:
        if isinstance(item, Iterable) and not isinstance(item, str):
            n += 1

    return n


def is_list_empty(items):
    if isinstance(items, list):  # Is a list
        return all(map(is_list_empty, items))
    return False  # Not a list


def combine_items(lis):
    for item in lis:
        if isinstance(item, Iterable) and not isinstance(item, str):
            for x in combine_items(item):
                yield x
        else:
            yield item


# -------------------- Border T-GRAANK ----------------------------

def trad(dataset):

    temp = dataset
    if temp[0][0].replace('.', '', 1).isdigit() or temp[0][0].isdigit():
        return [[float(temp[j][i]) for j in range(len(temp))] for i in range(len(temp[0]))]
    else:
        if temp[0][1].replace('.', '', 1).isdigit() or temp[0][1].isdigit():
            return [[float(temp[j][i]) for j in range(len(temp))] for i in range(1, len(temp[0]))]
        else:
            title = []
            for i in range(len(temp[0])):
                sub = (str(i+1) + ' : ' + temp[0][i])
                title.append(sub)
            return title, [[float(temp[j][i]) for j in range(1, len(temp))] for i in range(len(temp[0]))]


def graank_init(T, eq=False):
    res = []
    n = len(T[0])
    for i in range(len(T)):
        npl = str(i + 1) + '+'
        nm = str(i + 1) + '-'
        tempp = np.zeros((n, n), dtype='bool')
        tempm = np.zeros((n, n), dtype='bool')
        for j in range(n):
            for k in range(j + 1, n):
                if T[i][j] > T[i][k]:
                    tempp[j][k] = 1
                    tempm[k][j] = 1
                else:
                    if T[i][j] < T[i][k]:
                        # print (j,k)
                        tempm[j][k] = 1
                        tempp[k][j] = 1
                    else:
                        if eq:
                            tempm[j][k] = 1
                            tempp[k][j] = 1
                            tempp[j][k] = 1
                            tempm[k][j] = 1
        res.append((set([npl]), tempp))
        res.append((set([nm]), tempm))
    return res


def set_max(R):
    i = 0
    k = 0
    Cb = R
    while i < len(Cb) - 1:
        test = 0
        k = i + 1
        while k < len(Cb):
            if Cb[i].issuperset(Cb[k]) or Cb[i] == Cb[k]:
                del Cb[k]
            else:
                if Cb[i].issubset(Cb[k]):
                    del Cb[i]
                    test = 1
                    break
            k += 1
        if test == 1:
            continue
        i += 1
    return Cb


def inv(s):
    i = len(s) - 1
    if s[i] == '+':
        return s[0:i] + '-'
    else:
        return s[0:i] + '+'


def apriori_gen(R, a, n):
    res = []
    I = []
    if len(R) < 2:
        return []
    Ck = [x[0] for x in R]
    for i in range(len(R) - 1):
        for j in range(i + 1, len(R)):
            temp = R[i][0] | R[j][0]
            invtemp = {inv(x) for x in temp}
            if ((len(temp) == len(R[0][0]) + 1) and (not (I != [] and temp in I)) and (not (I != [] and invtemp in I))):
                test = 1
                for k in temp:
                    temp2 = temp - set([k])
                    invtemp2 = {inv(x) for x in temp2}
                    if not temp2 in Ck and not invtemp2 in Ck:
                        test = 0
                        break
                if test == 1:
                    m = R[i][1] * R[j][1]
                    t = float(np.sum(m)) / float(n * (n - 1.0) / 2.0)
                    if t > a:
                        res.append((temp, m))
                I.append(temp)
                gc.collect()

    return res

# ------------------ MODIFIED METHOD -----------------------------------------


def graank(D_in, a, t_diffs, eq=False):
    title = D_in[0]
    T = D_in[1]
    res = []
    res2 = []
    res3 = []
    n = len(T[0])
    G = graank_init(T, eq)
    for i in G:
        temp = float(np.sum(i[1])) / float(n * (n - 1.0) / 2.0)
        if temp < a:
            G.remove(i)
    while G != []:
        G = apriori_gen(G, a, n)
        i = 0
        while i < len(G) and G != []:
            temp = float(np.sum(G[i][1])) / float(n * (n - 1.0) / 2.0)
            if temp < a:
                del G[i]
            else:
                z = 0
                while z < (len(res) - 1):
                    if res[z].issubset(G[i][0]):
                        del res[z]
                        del res2[z]
                    else:
                        z = z + 1
                # return fetch indices (array) of G[1] where True
                t_lag = calculate_time_lag(get_pattern_indices(G[i][1]), t_diffs, a)
                if t_lag != False:
                    res.append(G[i][0])
                    res2.append(temp)
                    res3.append(t_lag)
                i += 1
    return title, res, res2, res3


def fuse(L):
    Res = L[0][:][:4000]
    for j in range(len(L[0])):
        for i in range(1, len(L)):
            Res[j] = Res[j] + L[i][j][:4000]
    return Res


def fuse_trad(L):
    temp = []
    for i in L:
        temp.append(trad(i))
    return fuse(temp)


def get_support(T, s, eq=False):
    n = len(T[0])
    res = 0
    for i in range(len(T[0])):
        for j in range(i + 1, len(T[0])):
            temp = 1
            tempinv = 1
            for k in s:
                x = int(k[0:(len(s) - 1)]) - 1
                if (k[len(s) - 1] == '+'):
                    if (T[x][i] > T[x][j]):
                        tempinv = 0
                    else:
                        if (T[x][i] < T[x][j]):
                            temp = 0
                else:
                    if (T[x][i] < T[x][j]):
                        tempinv = 0
                    else:
                        if (T[x][i] > T[x][j]):
                            temp = 0
                if (T[x][i] == T[x][j] and not eq):
                    temp = 0
                    tempinv = 0
            res = res + temp + tempinv
    return float(res) / float(n * (n - 1.0) / 2.0)

# -------------- ADDED CODE -----------------------------


def calculate_time_lag(indices, time_diffs, minsup):
    time_lags = get_time_lag(indices, time_diffs)
    time_lag, sup = init_fuzzy_support(time_lags, time_diffs, minsup)
    p_value_str = "%.2f" % float(time_lag[1])
    supp_str = "%.2f" % float(sup)
    if sup >= minsup:
        msg = ("~ " + time_lag[0] + p_value_str + " " + str(time_lag[2]) + " : " + supp_str)
        return msg
    else:
        return False


def get_pattern_indices(D):
    indices = []
    t_rows = len(D)
    t_columns = len(D[0])
    for r in range(t_rows):
        for c in range(t_columns):
            if D[c][r] == 1:
                index = [r,c]
                indices.append(index)
    return indices


def get_time_lag(indices, time_diffs):
    if len(indices) > 0:
        indxs = np.unique(indices[0])
        time_lags = []
        for i in indxs:
            if i >= 0 and i < len(time_diffs):
                time_lags.append(time_diffs[i])
        return time_lags
    else:
        raise Exception("Error: No pattern found for fetching time-lags")


def check_for_pattern(ref_item, R):
    pr = 0
    for i in range(len(R)):
        # D is the Gradual Patterns, S is the support for D and T is time lag
        if (str(ref_item + 1) + '+' in R[i]) or (str(ref_item + 1) + '-' in R[i]):
            # select only relevant patterns w.r.t *reference item
            pr = pr + 1
    if pr > 0:
        return True
    else:
        return False

# --------------------- CODE FOR EMERGING PATTERNS -------------------------------------------


def get_maximal_items(init_list, tlag_list):
    comb = list((zip(init_list, tlag_list)))
    max_items = gen_set(tuple(init_list))

    for item_i in max_items:
        for item_j in max_items:
            if set(item_i).issubset(set(item_j)) and set(item_i) != (set(item_j)):
                try:
                    # temp.remove(item_i)
                    for item in comb:
                        if tuple(item[0]) == item_i:
                            comb.remove(item)
                except:
                    continue
    return comb

# --------------------- EXECUTE T-GRAANK and BORDER T-GRAANK ----------------------------------------------

def algorithm_fuzzy(filename, ref_item, minsup, minrep):
    try:
        # 1. Load dataset into program
        dataset = DataTransform(filename, ref_item, minrep)

        #2. TRANSFORM DATA (for each step)
        patterns = 0
        for s in range(dataset.max_step):
            step = s+1 # because for-loop is not inclusive from range: 0 - max_step
            # 3. Calculate representativity
            chk_rep, rep_info = dataset.get_representativity(step)

            if chk_rep:
                # 4. Transform data
                data, time_diffs = dataset.transform_data(step)

                # 5. Execute GRAANK for each transformation
                title, gp_list, sup_list, tlag_list = graank(trad(list(data)), minsup, time_diffs, eq=False)

                pattern_found = check_for_pattern(ref_item, gp_list)
                if pattern_found:
                    if s > 0:
                        print("<br>")
                    rep = rep_info['Representativity']
                    rep_str = "%.2f" % rep
                    #rep_info['Representativity'] = rep_str
                    print("<h5>Representativity: "+str(rep_str)+"</h5>")
                    for line in title:
                        print(str(line)+"<br>")
                    print('<h5>Pattern : Support | Time-lag : Support</h5>')
                    for i in range(len(gp_list)):
                        # D is the Gradual Patterns, S is the support for D and T is time lag
                        if (str(ref_item+1)+'+' in gp_list[i]) or (str(ref_item+1)+'-' in gp_list[i]):
                            # select only relevant patterns w.r.t *reference item
                            supp_str = "%.2f" % float(sup_list[i])
                            print(str(tuple(gp_list[i])) + ' : ' + supp_str + ' | ' + str(tlag_list[i]) + "<br>")
                            patterns = patterns + 1
                    #print("---------------------------")
        if patterns == 0:
            print("<h5>Oops! no relevant pattern was found</h5>")
            #print("-------------------------------")
        sys.stdout.flush()
    except Exception as error:
        print(error)
        sys.stdout.flush()


def algorithm_ep_fuzzy(filename, ref_item, minsup, minrep):
    try:
        fgp_list = list()  # fuzzy-temporal gradual patterns

        # 1. Load dataset into program
        dataset = DataTransform(filename, ref_item, minrep)

        # 2. TRANSFORM DATA (for each step)
        for s in range(dataset.max_step):
            step = s+1  # because for-loop is not inclusive from range: 0 - max_step
            # 3. Calculate representativity
            chk_rep, rep_info = dataset.get_representativity(step)

            if chk_rep:
                # 4. Transform data
                data, time_diffs = dataset.transform_data(step)

                # 5. Execute GRAANK for each transformation
                title, gp_list, sup_list, tlag_list = graank(trad(list(data)), minsup, time_diffs, eq=False)

                pattern_found = check_for_pattern(ref_item, gp_list)
                if pattern_found:
                    maximal_items = get_maximal_items(gp_list, tlag_list)
                    fgp_list.append(tuple((title, maximal_items)))
        if not fgp_list:
            print("<h5>Oops! no frequent patterns were found</h5>")
            #print("----------------------------------------------------------------")
        else:
            print("<h5>No. of Transformations: " + str(dataset.max_step) + "</h5>")
            #print("----------------------------------------------------------------")
            for line in title:
                print(str(line) + "<br>")
            print("<h5>Patterns | Time Lags: (Trans. n, Trans. m)</h5>")
            all_fgps = list()
            for item_list in fgp_list:
                for item in item_list[1]:
                    all_fgps.append(item)
            patterns = 0
            ep_list = list()
            for i in range(len(all_fgps)):
                for j in range(i, len(all_fgps)):
                    if i != j:
                        freq_pattern_1 = all_fgps[i]
                        freq_pattern_2 = all_fgps[j]
                        ep = mbdll_border(tuple(freq_pattern_1[0]), tuple(freq_pattern_2[0]))
                        tlags = tuple((freq_pattern_1[1], freq_pattern_2[1]))
                        if ep:
                            patterns = patterns + 1
                            temp = tuple((ep, tlags))
                            ep_list.append(temp)
                            print(str(temp[0]) + " | " + str(temp[1]) + "<br>")
            #print("\nTotal: " + str(patterns) + " FtGEPs found!")
            #print("---------------------------------------------------------")
            if patterns == 0:
                print("<h5>Oops! no relevant emerging pattern was found</h5>")
                #print("---------------------------------------------------------")
        sys.stdout.flush()
    except Exception as error:
        print(error)
        sys.stdout.flush()

# ------------------------- main method ----------------------------------------------------


request = int(sys.argv[1])
#if request == 1:
    # gradual patterns
#    file_name = str(sys.argv[2])
#    min_sup = float(sys.argv[3])
#    algorithm_gradual(file_name, min_sup)
if request == 2:
    # fuzzy-temporal patterns
    file_name = str(sys.argv[2])
    ref_col = int(sys.argv[3])
    min_sup = float(sys.argv[4])
    min_rep = float(sys.argv[5])
    algorithm_fuzzy(file_name, ref_col, min_sup, min_rep)
#elif request == 11:
    # emerging gradual Patterns
#    file_name = str(sys.argv[2])
#    min_sup = float(sys.argv[3])
#    algorithm_ep_gradual(file_name, min_sup)
elif request == 12:
    # emerging fuzzy-temporal Patterns
    file_name = str(sys.argv[2])
    ref_col = int(sys.argv[3])
    min_sup = float(sys.argv[4])
    min_rep = float(sys.argv[5])
    algorithm_ep_fuzzy(file_name, ref_col, min_sup, min_rep)
elif request == 21:
    # check data-set for time
    file_name = str(sys.argv[2])
    cols, data = DataTransform.test_dataset(file_name)
    if cols:
        print("true")
    else:
        print("false")
    sys.stdout.flush()
else:
    print("<h5>Request not found!</h5>")
    sys.stdout.flush()
